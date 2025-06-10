import { Application, Request } from 'express';
import expressWs from 'express-ws';
import WebSocket from 'ws';
import { HandlerMetadata } from '@arifwidianto/dawai-microservice';
import { ParameterType } from '@arifwidianto/dawai-common';
import { WebServiceContext } from '../interfaces';

export interface WebSocketHandlerOptions {
  path: string;
}

export class DawaiWebSocketHandler {
  private wsInstance: expressWs.Instance;
  private wsHandlers: Map<string, Array<HandlerMetadata>> = new Map();
  private app: expressWs.Application;
  private websocketPath: string;

  constructor(expressApp: Application, wsInstance: expressWs.Instance, options: WebSocketHandlerOptions) {
    this.app = expressApp as expressWs.Application;
    this.wsInstance = wsInstance;
    this.websocketPath = options.path || '/ws';
  }

  public registerWsHandler(eventName: string, metadata: HandlerMetadata): void {
    if (!this.wsHandlers.has(eventName)) {
      this.wsHandlers.set(eventName, []);
    }
    this.wsHandlers.get(eventName)!.push(metadata);
    console.log(`DawaiWebSocketHandler: Registered WebSocket handler for event '${eventName}' for ${metadata.methodName}`);
  }

  private async _handleWsMessage(wsClient: WebSocket, req: Request, msg: WebSocket.Data): Promise<void> {
    let parsedMsg: { event?: string; data?: any };
    try {
      if (typeof msg !== 'string') {
        wsClient.send(JSON.stringify({ error: 'Invalid message format, expected string.' }));
        return;
      }
      parsedMsg = JSON.parse(msg);
      if (typeof parsedMsg !== 'object' || parsedMsg === null || !parsedMsg.event) {
        wsClient.send(JSON.stringify({ error: 'Invalid message format, "event" field is missing.' }));
        return;
      }
    } catch (e) {
      wsClient.send(JSON.stringify({ error: 'Invalid JSON message.' }));
      return;
    }

    const eventName = parsedMsg.event;
    const handlersForEvent = this.wsHandlers.get(eventName);

    if (handlersForEvent) {
      for (const handlerMeta of handlersForEvent) {
        try {
          const dataToValidate = parsedMsg.data;
          // Schema validation
          if (handlerMeta.schema) {
            const validationResult = handlerMeta.schema.safeParse(dataToValidate);
            if (!validationResult.success) {
              if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify({
                  event: eventName,
                  error: 'Validation failed',
                  details: validationResult.error.flatten().fieldErrors
                }));
              }
              continue; 
            }
            // Use validationResult.data for the handler if needed, though parsedMsg.data is often used directly
          }
          
          // Argument injection
          const args: any[] = [];
          // Simplified: assumes body is the primary data payload and ctx provides context
          const bodyParam = handlerMeta.parameters.find(p => p.type === ParameterType.BODY);
          if (bodyParam) {
              args[bodyParam.index] = parsedMsg.data;
          }
          const ctxParam = handlerMeta.parameters.find(p => p.type === ParameterType.CTX);
          if (ctxParam) {
              args[ctxParam.index] = {
                req,
                // NOTE: `res` and `next` is not typically available directly in ws handler context in the same way as http
                // res: undefined,
                // next: undefined,
                ws: wsClient,
                eventName,
                messageData: parsedMsg.data
              } as WebServiceContext;
          }
          // TODO: Consider other ParameterTypes relevant for WebSocket context if any.

          // Execute handler
          const result = await handlerMeta.handlerFn.apply(handlerMeta.serviceInstance, args);
          if (result !== undefined && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(JSON.stringify({ event: eventName, payload: result }));
          }
        } catch (error) {
          console.error(`DawaiWebSocketHandler: Error executing WebSocket handler for event '${eventName}':`, error);
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(JSON.stringify({ event: eventName, error: 'Handler execution failed.' }));
          }
        }
      }
    } else {
      if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ event: eventName, error: `No handler for event '${eventName}'` }));
      }
    }
  }

  public setupRoutes(): void {
    if (this.wsHandlers.size === 0) {
      console.log('DawaiWebSocketHandler: No WebSocket handlers registered. Skipping route setup.');
      return;
    }

    this.app.ws(this.websocketPath, (wsClient: WebSocket, req: Request) => {
      console.log(`DawaiWebSocketHandler: WebSocket client connected via ${this.websocketPath}`);

      wsClient.on('message', (msg: WebSocket.Data) => {
        this._handleWsMessage(wsClient, req, msg); // Delegate to the new method
      });

      wsClient.on('close', () => {
        console.log(`DawaiWebSocketHandler: WebSocket client disconnected from ${this.websocketPath}`);
      });
      wsClient.on('error', (err) => {
        console.error(`DawaiWebSocketHandler: WebSocket error on path ${this.websocketPath}:`, err);
      });
    });
    console.log(`DawaiWebSocketHandler: WebSocket route ${this.websocketPath} initialized for ${this.wsHandlers.size} event(s).`);
  }

  public closeAllConnections(): void {
    if (this.wsInstance && this.wsInstance.getWss()) {
      this.wsInstance.getWss().clients.forEach(client => client.close());
      console.log('DawaiWebSocketHandler: All WebSocket client connections closed.');
    }
  }
}
