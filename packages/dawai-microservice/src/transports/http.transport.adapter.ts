import { Application, Request, Response, NextFunction, json, urlencoded } from 'express';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as http from 'http';
import cors from 'cors';
import { ZodError } from 'zod';
import expressWs from 'express-ws';
import WebSocket from 'ws';
import { TransportAdapter } from '../base/transport.adapter';
import { WebserviceOptions as FullWebserviceOptions } from '../microservice.options';
import { metadataStorage } from '../decorators/metadata.storage'; // Import MetadataStorage
import { ParameterType } from '../decorators/parameter.options'; // Import ParameterType

export class HttpTransportAdapter extends TransportAdapter {
  public static readonly configKey = 'webservice';

  private app!: Application;
  private server!: http.Server;
  private port: number = 3000;
  private host?: string;
  private basePath: string = '';
  private websocketPath: string = '/';
  private isWebsocketEnabled: boolean = false;
  private wsInstance!: expressWs.Instance;
  private wsHandlers: Map<string, Array<{ handlerFn: Function, metadata: any, serviceInstance: any, paramMetadatas: any[] | undefined }>> = new Map();


  constructor() {
    super();
  }

  async initialize(config: FullWebserviceOptions): Promise<void> {
    // Ensure that the main 'enabled' flag for the transport is checked first.
    if (config.enabled === false) {
      console.log('HttpTransportAdapter is disabled by configuration. Skipping initialization.');
      // Potentially set an internal flag to prevent further operations if needed.
      return;
    }

    const options = config.options; // These are the HttpServerOptions
    if (!options) {
      console.warn('HttpTransportAdapter initialized without specific options. Using defaults.');
      // Potentially set default options here if 'options' can be undefined.
      // For now, assuming 'options' will typically be provided if 'enabled' is true.
      return;
    }

    this.app = express();
    this.port = options.port || 3000;
    this.host = options.host;
    this.basePath = options.crud?.options?.basePath || '';
    this.websocketPath = options.websocket?.path || '/';
    this.isWebsocketEnabled = !!(options.websocket as { path?: string; enabled?: boolean; options?: any })?.enabled; // Check sub-feature enabled status

    this.app.use(json());
    this.app.use(urlencoded({ extended: true }));
    this.app.use(cookieParser());

    if (options.cors?.enabled) {
      this.app.use(options.cors.options ? cors(options.cors.options) : cors());
    }
    // Note: express-ws initialization is tied to the server instance, handled in listen()
  }

  private setupWebSocketRoutes(): void {
    if (this.isWebsocketEnabled && this.wsHandlers.size > 0 && this.wsInstance) {
        (this.app as expressWs.Application).ws(this.websocketPath, (wsClient: WebSocket, req: Request) => {
            console.log(`HttpTransportAdapter: WebSocket client connected via ${this.websocketPath}`);

            wsClient.on('message', async (msg: WebSocket.Data) => {
                let parsedMsg;
                try {
                    if (typeof msg !== 'string') {
                        // Assuming binary messages are not part of the protocol for now
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
                    for (const handlerDetail of handlersForEvent) {
                        try {
                            const wsOptions = handlerDetail.metadata; // This is WsDecoratorOptions
                            let messageData = parsedMsg.data;

                            if (wsOptions.schema) {
                                const validationResult = wsOptions.schema.safeParse(messageData);
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
                                messageData = validationResult.data;
                            }

                            const args: any[] = [];
                            if (handlerDetail.paramMetadatas) {
                                for (const paramMeta of handlerDetail.paramMetadatas) {
                                    switch (paramMeta.type) {
                                        case ParameterType.BODY: // Using BODY for WebSocket message data/payload
                                            args[paramMeta.index] = messageData;
                                            break;
                                        case ParameterType.CTX:
                                            args[paramMeta.index] = { ws: wsClient, req };
                                            break;
                                        // Potentially other types like PARAMS or QUERY from the initial 'req'
                                        case ParameterType.PARAMS:
                                            args[paramMeta.index] = paramMeta.key ? req.params[paramMeta.key] : req.params;
                                            break;
                                        case ParameterType.QUERY:
                                            args[paramMeta.index] = paramMeta.key ? req.query[paramMeta.key] : req.query;
                                            break;
                                        case ParameterType.HEADERS:
                                            args[paramMeta.index] = paramMeta.key ? req.headers[paramMeta.key.toLowerCase()] : req.headers;
                                            break;
                                        default:
                                            args[paramMeta.index] = undefined;
                                    }
                                }
                            }

                            const result = await handlerDetail.handlerFn(...args);
                            if (result !== undefined) {
                                if (wsClient.readyState === WebSocket.OPEN) {
                                    wsClient.send(JSON.stringify({ event: eventName, payload: result }));
                                }
                            }
                        } catch (error) {
                            console.error(`HttpTransportAdapter: Error executing WebSocket handler for event '${eventName}':`, error);
                            if (wsClient.readyState === WebSocket.OPEN) {
                                wsClient.send(JSON.stringify({ event: eventName, error: 'Handler execution failed.' }));
                            }
                        }
                    }
                } else {
                    // console.log(`HttpTransportAdapter: No WebSocket handlers for event: ${eventName}`);
                    if (wsClient.readyState === WebSocket.OPEN) {
                        wsClient.send(JSON.stringify({ event: eventName, error: `No handler for event '${eventName}'` }));
                    }
                }
            });

            wsClient.on('close', () => {
                console.log(`HttpTransportAdapter: WebSocket client disconnected from ${this.websocketPath}`);
            });
            wsClient.on('error', (err) => {
                console.error(`HttpTransportAdapter: WebSocket error on path ${this.websocketPath}:`, err);
            });
        });
        console.log(`HttpTransportAdapter: WebSocket route ${this.websocketPath} initialized for ${this.wsHandlers.size} event(s).`);
    }
  }

  async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.app) {
        return reject(new Error('HttpTransportAdapter not initialized. Call initialize() first.'));
      }

      // Create HTTP server
      this.server = http.createServer(this.app);

      // Initialize express-ws with the app and server
      if (this.isWebsocketEnabled) {
        this.wsInstance = expressWs(this.app, this.server);
        this.setupWebSocketRoutes(); // Now call setupWebSocketRoutes after wsInstance is created
      }

      const listenHost = this.host || '0.0.0.0';
      this.server.listen(this.port, listenHost, () => {
        console.log(`HttpTransportAdapter: Server listening on ${listenHost}:${this.port}`);
        resolve();
      });
      this.server.on('error', (err) => {
        console.error('HttpTransportAdapter: Server error:', err);
        reject(err);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  registerHandler(methodName: string, metadata: any, handlerFn: Function, serviceInstance: any): void {
    if (metadata?.crud) {
      const crudOptions = metadata.crud;
      const httpMethod: string = String(crudOptions.method).toLowerCase();

      let endpointPath = crudOptions.endpoint.startsWith('/') ? crudOptions.endpoint : '/' + crudOptions.endpoint;
      if (endpointPath === '/') endpointPath = '';

      let fullPath = this.basePath;
      if (fullPath.endsWith('/')) fullPath = fullPath.slice(0, -1);
      if (!endpointPath.startsWith('/') && endpointPath !== '') fullPath += '/';
      fullPath += endpointPath;
      if (fullPath === '' || fullPath === '/') fullPath = '/';

      if (typeof (this.app as any)[httpMethod] === 'function') {
        console.log(`HttpTransportAdapter: Registering route ${httpMethod.toUpperCase()} ${fullPath} to call ${serviceInstance.constructor.name}.${methodName}`);

        (this.app as any)[httpMethod](fullPath, async (req: Request, res: Response, next: NextFunction) => {
          try {
            // console.log(`HttpTransportAdapter: Route ${httpMethod.toUpperCase()} ${fullPath} matched. Preparing args for ${serviceInstance.constructor.name}.${methodName}`);

            const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
            const args: any[] = [];

            if (paramMetadatas) {
              // console.log('Found parameter metadata:', paramMetadatas);
              for (const paramMeta of paramMetadatas) {
                switch (paramMeta.type) {
                  case ParameterType.BODY:
                    args[paramMeta.index] = req.body;
                    // console.log(`Arg[${paramMeta.index}] (BODY): `, req.body);
                    break;
                  case ParameterType.PARAMS:
                    args[paramMeta.index] = paramMeta.key ? req.params[paramMeta.key] : req.params;
                    // console.log(`Arg[${paramMeta.index}] (PARAMS${paramMeta.key ? '['+paramMeta.key+']' : ''}): `, args[paramMeta.index]);
                    break;
                  case ParameterType.QUERY:
                    args[paramMeta.index] = paramMeta.key ? req.query[paramMeta.key] : req.query;
                    // console.log(`Arg[${paramMeta.index}] (QUERY${paramMeta.key ? '['+paramMeta.key+']' : ''}): `, args[paramMeta.index]);
                    break;
                  case ParameterType.HEADERS:
                    args[paramMeta.index] = paramMeta.key ? req.headers[paramMeta.key.toLowerCase()] : req.headers;
                    break;
                  case ParameterType.COOKIES:
                    args[paramMeta.index] = paramMeta.key ? req.cookies?.[paramMeta.key] : req.cookies;
                    break;
                  case ParameterType.SESSION:
                    args[paramMeta.index] = (req as any).session;
                    break;
                  case ParameterType.FILES:
                    args[paramMeta.index] = (req as any).files;
                    break;
                  case ParameterType.CTX:
                    args[paramMeta.index] = { req, res };
                    break;
                  case ParameterType.REQ:
                    args[paramMeta.index] = req;
                    break;
                  case ParameterType.RES:
                    args[paramMeta.index] = res;
                    break;
                  default:
                    // console.log(`Arg[${paramMeta.index}] (Unhandled type ${paramMeta.type}): undefined`);
                    args[paramMeta.index] = undefined;
                }
              }
            } else {
              // console.log('No parameter metadata found for this method.');
            }

            // Validate req.body if schema is provided
            if (crudOptions.schema) {
              try {
                const parsed = crudOptions.schema.safeParse(req.body);
                if (!parsed.success) {
                  console.error(`HttpTransportAdapter: Validation failed for ${serviceInstance.constructor.name}.${methodName} on path ${fullPath}:`, parsed.error.formErrors);
                  if (!res.headersSent) {
                    res.status(400).json({
                      message: 'Validation failed',
                      errors: parsed.error.flatten().fieldErrors,
                    });
                  }
                  return; // Stop further processing
                }
                // If validation is successful, update the body in args array
                if (paramMetadatas) {
                  for (const paramMeta of paramMetadatas) {
                    if (paramMeta.type === ParameterType.BODY) {
                      args[paramMeta.index] = parsed.data;
                      // console.log(`Arg[${paramMeta.index}] (BODY) updated after Zod parsing: `, parsed.data);
                      break;
                    }
                  }
                }
              } catch (error) {
                console.error(`HttpTransportAdapter: Unexpected error during Zod schema validation for ${serviceInstance.constructor.name}.${methodName} on path ${fullPath}:`, error);
                if (!res.headersSent) {
                  res.status(500).json({
                    message: 'Error during request validation.',
                    error: error instanceof Error ? error.message : String(error),
                  });
                }
                return;
              }
            }

            // console.log('Constructed arguments:', args);
            const result = await handlerFn(...args); // Call with constructed arguments

            if (res.headersSent) {
              // console.warn(`HttpTransportAdapter: Headers already sent for route ${fullPath}, cannot send result.`);
              return;
            }
            res.json(result);
          } catch (error) {
            console.error(`HttpTransportAdapter: Error calling handler ${serviceInstance.constructor.name}.${methodName} for ${fullPath}:`, error);
            if (!res.headersSent) {
              res.status(500).json({
                message: `Error executing handler: ${serviceInstance.constructor.name}.${methodName}`,
                error: error instanceof Error ? error.message : String(error)
              });
            } else {
              next(error);
            }
          }
        });
      } else {
        console.warn(`HttpTransportAdapter: Invalid HTTP method '${httpMethod}' for ${methodName} at ${fullPath}`);
      }
    } else if (metadata?.sse) {
      const sseOptions = metadata.sse;
      const httpMethod: string = String(sseOptions.method || 'get').toLowerCase();

      let endpointPath = sseOptions.endpoint.startsWith('/') ? sseOptions.endpoint : '/' + sseOptions.endpoint;
      if (endpointPath === '/') endpointPath = '';

      let fullPath = this.basePath; // Assuming basePath is relevant for SSE too
      if (fullPath.endsWith('/')) fullPath = fullPath.slice(0, -1);
      if (!endpointPath.startsWith('/') && endpointPath !== '') fullPath += '/';
      fullPath += endpointPath;
      if (fullPath === '' || fullPath === '/') fullPath = '/';

      if (typeof (this.app as any)[httpMethod] === 'function') {
        console.log(`HttpTransportAdapter: Registering SSE route ${httpMethod.toUpperCase()} ${fullPath} to call ${serviceInstance.constructor.name}.${methodName}`);

        (this.app as any)[httpMethod](fullPath, async (req: Request, res: Response, next: NextFunction) => {
          try {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
            const args: any[] = [];

            if (paramMetadatas) {
              for (const paramMeta of paramMetadatas) {
                switch (paramMeta.type) {
                  case ParameterType.BODY:
                    args[paramMeta.index] = req.body;
                    break;
                  case ParameterType.PARAMS:
                    args[paramMeta.index] = paramMeta.key ? req.params[paramMeta.key] : req.params;
                    break;
                  case ParameterType.QUERY:
                    args[paramMeta.index] = paramMeta.key ? req.query[paramMeta.key] : req.query;
                    break;
                  case ParameterType.HEADERS:
                    args[paramMeta.index] = paramMeta.key ? req.headers[paramMeta.key.toLowerCase()] : req.headers;
                    break;
                  case ParameterType.COOKIES:
                    args[paramMeta.index] = paramMeta.key ? req.cookies?.[paramMeta.key] : req.cookies;
                    break;
                  case ParameterType.SESSION:
                    args[paramMeta.index] = (req as any).session;
                    break;
                  case ParameterType.FILES:
                    args[paramMeta.index] = (req as any).files;
                    break;
                  case ParameterType.CTX:
                    args[paramMeta.index] = { req, res };
                    break;
                  case ParameterType.REQ:
                    args[paramMeta.index] = req;
                    break;
                  case ParameterType.RES:
                    args[paramMeta.index] = res; // Crucial for SSE
                    break;
                  default:
                    args[paramMeta.index] = undefined;
                }
              }
            }

            // Note: Zod schema validation for sseOptions.schema could be added here if needed in the future

            await handlerFn(...args);

            req.on('close', () => {
              console.log(`HttpTransportAdapter: SSE client disconnected from ${fullPath}`);
              if (!res.writableEnded) {
                res.end();
              }
              // Consider if any specific cleanup for this stream is needed in the adapter
              // User's handler is responsible for its own resource cleanup (intervals, etc.)
            });

          } catch (error) {
            console.error(`HttpTransportAdapter: Error in SSE handler ${serviceInstance.constructor.name}.${methodName} for ${fullPath}:`, error);
            // Hard to send a proper error response once stream started.
            // Ensure connection is closed if an error occurs before/during handler execution
            if (!res.writableEnded) {
                res.end();
            }
          }
        });
      } else {
        console.warn(`HttpTransportAdapter: Invalid HTTP method '${httpMethod}' for SSE ${methodName} at ${fullPath}`);
      }
    } else if (metadata?.ws) {
        const wsOptions = metadata.ws;
        const eventName = wsOptions.event;
        if (!eventName) {
            console.warn(`HttpTransportAdapter: @ws decorator on ${serviceInstance.constructor.name}.${methodName} is missing 'event' option.`);
            return;
        }

        const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
        const handlerDetail = {
            handlerFn,
            metadata: wsOptions, // Store WsDecoratorOptions
            serviceInstance,
            paramMetadatas
        };

        if (!this.wsHandlers.has(eventName)) {
            this.wsHandlers.set(eventName, []);
        }
        this.wsHandlers.get(eventName)!.push(handlerDetail);
        console.log(`HttpTransportAdapter: Registering WebSocket handler for event '${eventName}' to call ${serviceInstance.constructor.name}.${methodName}`);
    }
  }
}
