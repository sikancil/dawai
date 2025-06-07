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
import { metadataStorage } from '../decorators/metadata.storage';
import { ParameterType } from '../decorators/parameter.options';
import { DawaiMiddleware, MiddlewareType } from '../core/middleware.interface';

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
  private wsHandlers: Map<string, Array<{ methodName: string, handlerFn: Function, metadata: any, serviceInstance: any, paramMetadatas: any[] | undefined }>> = new Map();


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

    // this.isWebsocketEnabled = !!(options.websocket as { enabled?: boolean })?.enabled; 
    this.isWebsocketEnabled = !!(options.websocket as { enabled?: boolean; path?: string; options?: any })?.enabled; // Check sub-feature enabled status

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
              const { handlerFn, metadata: wsOptions, serviceInstance, paramMetadatas, methodName: wsMethodName } = handlerDetail;

              const methodSpecificMetadata = metadataStorage.getMethodMetadata(serviceInstance.constructor, wsMethodName);
              const middlewareTypes: MiddlewareType[] | undefined = methodSpecificMetadata?.useMiddleware;

              const executeOriginalWsHandler = async (currentMessageData: any) => {
                // Schema validation (using currentMessageData)
                if (wsOptions.schema) {
                  const validationResult = wsOptions.schema.safeParse(currentMessageData);
                  if (!validationResult.success) {
                    if (wsClient.readyState === WebSocket.OPEN) {
                      wsClient.send(JSON.stringify({
                        event: eventName,
                        error: 'Validation failed',
                        details: validationResult.error.flatten().fieldErrors
                      }));
                    }
                    return; // Skip this handler for this message
                  }
                  currentMessageData = validationResult.data; // Use validated data
                }

                // Argument injection
                const args: any[] = [];
                if (paramMetadatas) {
                  for (const paramMeta of paramMetadatas) {
                    switch (paramMeta.type) {
                      case ParameterType.BODY:
                        args[paramMeta.index] = currentMessageData;
                        break;
                      case ParameterType.CTX:
                        args[paramMeta.index] = { ws: wsClient, req, eventName, messageData: currentMessageData };
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
                      default:
                        args[paramMeta.index] = undefined;
                    }
                  }
                }

                const result = await handlerFn(...args);
                if (result !== undefined) {
                  if (wsClient.readyState === WebSocket.OPEN) {
                    wsClient.send(JSON.stringify({ event: eventName, payload: result }));
                  }
                }
              };

              try {
                if (middlewareTypes && middlewareTypes.length > 0) {
                  const middlewares = middlewareTypes.map(mw => {
                    if (typeof mw === 'function' && mw.prototype?.use) {
                      return new (mw as new (...args: any[]) => DawaiMiddleware)();
                    }
                    return mw as DawaiMiddleware;
                  }).filter(mw => typeof mw.use === 'function');

                  // Context for WebSocket middleware, messageData can be modified by middleware
                  let currentMessageDataForChain = parsedMsg.data;
                  const wsContext = {
                    ws: wsClient,
                    req, // Initial HTTP Upgrade request
                    eventName,
                    get messageData() { return currentMessageDataForChain; },
                    set messageData(newData: any) { currentMessageDataForChain = newData; }
                  };

                  let chain = async () => executeOriginalWsHandler(currentMessageDataForChain);

                  for (let i = middlewares.length - 1; i >= 0; i--) {
                    const currentMiddleware = middlewares[i];
                    const nextInChain = chain;
                    chain = async () => currentMiddleware.use(wsContext, nextInChain);
                  }
                  await chain();
                } else {
                  await executeOriginalWsHandler(parsedMsg.data);
                }
              } catch (error) {
                console.error(`HttpTransportAdapter: Error executing WebSocket handler or middleware for event '${eventName}':`, error);
                if (wsClient.readyState === WebSocket.OPEN) {
                  wsClient.send(JSON.stringify({ event: eventName, error: 'Handler or middleware execution failed.' }));
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

        (this.app as any)[httpMethod](
          fullPath,
          async (req: Request, res: Response, nextExpress: NextFunction) => {
            try {
              const middlewareTypes: MiddlewareType[] | undefined = metadata?.useMiddleware;

              const executeOriginalHandler = async () => {
                const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
                const args: any[] = [];

                if (paramMetadatas) {
                  for (const paramMeta of paramMetadatas) {
                    switch (paramMeta.type) {
                      case ParameterType.BODY: args[paramMeta.index] = req.body; break;
                      case ParameterType.PARAMS: args[paramMeta.index] = paramMeta.key ? req.params[paramMeta.key] : req.params; break;
                      case ParameterType.QUERY: args[paramMeta.index] = paramMeta.key ? req.query[paramMeta.key] : req.query; break;
                      case ParameterType.HEADERS: args[paramMeta.index] = paramMeta.key ? req.headers[paramMeta.key.toLowerCase()] : req.headers; break;
                      case ParameterType.COOKIES: args[paramMeta.index] = paramMeta.key ? req.cookies?.[paramMeta.key] : req.cookies; break;
                      case ParameterType.SESSION: args[paramMeta.index] = (req as any).session; break;
                      case ParameterType.FILES: args[paramMeta.index] = (req as any).files; break;
                      case ParameterType.CTX: args[paramMeta.index] = { req, res, next: nextExpress }; break;
                      case ParameterType.REQ: args[paramMeta.index] = req; break;
                      case ParameterType.RES: args[paramMeta.index] = res; break;
                      default: args[paramMeta.index] = undefined;
                    }
                  }
                }

                if (crudOptions.schema) { // Zod validation for CRUD
                  const parsed = crudOptions.schema.safeParse(req.body);
                  if (!parsed.success) {
                    console.error(`HttpTransportAdapter: Validation failed for ${serviceInstance.constructor.name}.${methodName} on path ${fullPath}:`, parsed.error.formErrors);
                    if (!res.headersSent) {
                      res.status(400).json({
                        message: 'Validation failed',
                        errors: parsed.error.flatten().fieldErrors,
                      });
                    }
                    return;
                  }
                  // Update body in args if ParameterType.BODY was used
                  if (paramMetadatas) {
                    for (const paramMeta of paramMetadatas) {
                      if (paramMeta.type === ParameterType.BODY) {
                        args[paramMeta.index] = parsed.data;
                        break;
                      }
                    }
                  }
                }

                const result = await handlerFn(...args);
                if (!res.headersSent) {
                  res.json(result);
                }
              };

              if (middlewareTypes && middlewareTypes.length > 0) {
                const middlewares = middlewareTypes.map(mw => {
                  if (typeof mw === 'function' && mw.prototype?.use) { // Check if it's a class constructor
                    return new (mw as new (...args: any[]) => DawaiMiddleware)();
                  }
                  return mw as DawaiMiddleware; // Already an instance or a functional middleware (if we support those)
                }).filter(mw => typeof mw.use === 'function');


                const httpContext = { req, res, nextExpress };
                let chain = executeOriginalHandler;

                for (let i = middlewares.length - 1; i >= 0; i--) {
                  const currentMiddleware = middlewares[i];
                  const nextInChain = chain;
                  chain = async () => currentMiddleware.use(httpContext, nextInChain);
                }
                await chain();
              } else {
                await executeOriginalHandler();
              }
            } catch (error) {
              // console.error(`HttpTransportAdapter: Error in route handler for ${fullPath}:`, error);
              // If error is already an HttpError or headers sent, let Express handle or just log
              if (!res.headersSent && error instanceof Error) {
                nextExpress(error); // Pass to Express error handling
              } else if (!res.headersSent) {
                // Fallback for non-Error objects thrown
                nextExpress(new Error(String(error)));
              }
              // If headers already sent, Express default error handler will close the connection.
            }
          }
        );
      } else {
        console.warn(`HttpTransportAdapter: Invalid HTTP method '${httpMethod}' for ${methodName} at ${fullPath}`);
      }
    } else if (metadata?.sse) {
      const sseOptions = metadata.sse; // SseDecoratorOptions
      const httpMethod: string = String(sseOptions.method || 'get').toLowerCase();
      let endpointPath = sseOptions.endpoint.startsWith('/') ? sseOptions.endpoint : '/' + sseOptions.endpoint;
      if (endpointPath === '/') endpointPath = '';
      let fullPath = this.basePath;
      if (fullPath.endsWith('/')) fullPath = fullPath.slice(0, -1);
      if (!endpointPath.startsWith('/') && endpointPath !== '') fullPath += '/';
      fullPath += endpointPath;
      if (fullPath === '' || fullPath === '/') fullPath = '/';

      if (typeof (this.app as any)[httpMethod] === 'function') {
        console.log(`HttpTransportAdapter: Registering SSE route ${httpMethod.toUpperCase()} ${fullPath} to call ${serviceInstance.constructor.name}.${methodName}`);

        (this.app as any)[httpMethod](fullPath, async (req: Request, res: Response, nextExpress: NextFunction) => {
          try {
            const middlewareTypes: MiddlewareType[] | undefined = metadata?.useMiddleware;

            const executeOriginalSseHandler = async () => {
              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              res.flushHeaders();

              const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
              const args: any[] = [];
              if (paramMetadatas) {
                for (const paramMeta of paramMetadatas) {
                  switch (paramMeta.type) {
                    case ParameterType.BODY: args[paramMeta.index] = req.body; break;
                    case ParameterType.PARAMS: args[paramMeta.index] = paramMeta.key ? req.params[paramMeta.key] : req.params; break;
                    case ParameterType.QUERY: args[paramMeta.index] = paramMeta.key ? req.query[paramMeta.key] : req.query; break;
                    case ParameterType.HEADERS: args[paramMeta.index] = paramMeta.key ? req.headers[paramMeta.key.toLowerCase()] : req.headers; break;
                    case ParameterType.COOKIES: args[paramMeta.index] = paramMeta.key ? req.cookies?.[paramMeta.key] : req.cookies; break;
                    case ParameterType.SESSION: args[paramMeta.index] = (req as any).session; break;
                    case ParameterType.FILES: args[paramMeta.index] = (req as any).files; break;
                    case ParameterType.CTX: args[paramMeta.index] = { req, res, next: nextExpress }; break;
                    case ParameterType.REQ: args[paramMeta.index] = req; break;
                    case ParameterType.RES: args[paramMeta.index] = res; break;
                    default: args[paramMeta.index] = undefined;
                  }
                }
              }
              await handlerFn(...args); // User's SSE handler

              // req.on('close') should be managed by the user's handler if it needs to stop intervals, etc.
              // or here if we want to ensure res.end()
              req.on('close', () => {
                console.log(`HttpTransportAdapter: SSE client disconnected from ${fullPath}`);
                if (!res.writableEnded) {
                  res.end();
                }
              });
            };

            if (middlewareTypes && middlewareTypes.length > 0) {
              const middlewares = middlewareTypes.map(mw => {
                if (typeof mw === 'function' && mw.prototype?.use) {
                  return new (mw as new (...args: any[]) => DawaiMiddleware)();
                }
                return mw as DawaiMiddleware;
              }).filter(mw => typeof mw.use === 'function');

              const httpContext = { req, res, nextExpress };
              let chain = executeOriginalSseHandler;
              for (let i = middlewares.length - 1; i >= 0; i--) {
                const currentMiddleware = middlewares[i];
                const nextInChain = chain;
                chain = async () => currentMiddleware.use(httpContext, nextInChain);
              }
              await chain();
            } else {
              await executeOriginalSseHandler();
            }
          } catch (error) {
            console.error(`HttpTransportAdapter: Error in SSE route ${fullPath}:`, error);
            if (!res.headersSent) {
              nextExpress(error);
            } else if (!res.writableEnded) {
              res.end(); // Ensure connection is closed if headers sent but error occurred
            }
          }
        });
      } else {
        console.warn(`HttpTransportAdapter: Invalid HTTP method '${httpMethod}' for SSE ${methodName} at ${fullPath}`);
      }
    } else if (metadata?.ws) {
      const wsOptions = metadata.ws; // WsDecoratorOptions
      const eventName = wsOptions.event;
      if (!eventName) {
        console.warn(`HttpTransportAdapter: @ws decorator on ${serviceInstance.constructor.name}.${methodName} is missing 'event' option.`);
        return;
      }

      const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
      const handlerDetail = {
        methodName, // Store methodName for middleware retrieval
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
