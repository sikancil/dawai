import { Application, Request, Response, NextFunction, json, urlencoded } from 'express';
import express from 'express';
import cookieParser from 'cookie-parser';
import * as http from 'http';
import cors from 'cors';
import { ZodError, ZodSchema } from 'zod';
import expressWs from 'express-ws';
import {
  TransportAdapter,
  HandlerMetadata,
} from '@arifwidianto/dawai-microservice';
import {
  MicroserviceOptions,
  TransportType,
  ParameterType,
  // WebserviceOptions,
  // DawaiMiddleware, 
  // MiddlewareType
} from '@arifwidianto/dawai-common';
import { WebServiceContext } from '../interfaces';
import { DawaiWebSocketHandler, WebSocketHandlerOptions } from './websocket.handler';

export class WebServiceTransportAdapter extends TransportAdapter {
  public transportType: TransportType = TransportType.WEBSERVICE;
  public static readonly configKey = 'webservice';

  private app!: Application;
  private server!: http.Server;
  private port: number = 3000;
  private host?: string;
  private basePath: string = '';
  private isWebsocketEnabled: boolean = false;
  private wsInstance!: expressWs.Instance;
  private dawaiWsHandler?: DawaiWebSocketHandler;

  constructor(
    protected readonly microserviceOptions: MicroserviceOptions,
    protected readonly serviceInstance: any,
    protected readonly globalMiddleware: any[] = []
  ) {
    super(microserviceOptions, serviceInstance, globalMiddleware);
    this.transportType = TransportType.WEBSERVICE;
  }

  async initialize(): Promise<void> {
    const webserviceConfig = this.microserviceOptions.webservice;

    if (!webserviceConfig || !webserviceConfig.enabled) {
      console.log('WebServiceTransportAdapter is disabled by configuration. Skipping initialization.');
      return;
    }

    const options = webserviceConfig.options;
    if (!options) {
      console.warn('WebServiceTransportAdapter initialized without specific options. Using defaults.');
      this.app = express();
    } else {
      this.app = express();
      this.port = options.port || 3000;
      this.host = options.host;
      this.basePath = options.crud?.options?.basePath || '';

      if (options.websocket?.enabled) {
        this.isWebsocketEnabled = true;
      }

      this.app.use(json(options.bodyParser?.json));
      this.app.use(urlencoded(options.bodyParser?.urlencoded || { extended: true }));
      this.app.use(cookieParser());

      if (options.cors?.enabled) {
        this.app.use(options.cors.options ? cors(options.cors.options) : cors());
      }
    }
  }

  async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.app) {
        return reject(new Error('WebServiceTransportAdapter not initialized. Call initialize() first.'));
      }

      this.server = http.createServer(this.app);

      if (this.isWebsocketEnabled) {
        const webserviceConfig = this.microserviceOptions.webservice;
        const wsOptions = webserviceConfig?.options?.websocket;

        this.wsInstance = expressWs(this.app, this.server);
        const handlerOptions: WebSocketHandlerOptions = {
          path: wsOptions?.path || '/ws',
        };
        this.dawaiWsHandler = new DawaiWebSocketHandler(this.app, this.wsInstance, handlerOptions);
      }

      this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        console.error("Unhandled error in Express:", err);
        if (!res.headersSent) {
          if (err instanceof ZodError) {
            res.status(400).json({
              message: 'Validation Error',
              errors: err.flatten().fieldErrors,
            });
          } else {
            const statusCode = (err as any).statusCode || 500;
            res.status(statusCode).json({
              message: err.message || 'Internal Server Error',
            });
          }
        } else {
          next(err);
        }
      });

      if (this.dawaiWsHandler) {
        this.dawaiWsHandler.setupRoutes();
      }

      const listenHost = this.host || '0.0.0.0';
      this.server.listen(this.port, listenHost, () => {
        console.log(`WebServiceTransportAdapter: Server listening on ${listenHost}:${this.port}`);
        resolve();
      });
      this.server.on('error', (err) => {
        console.error('WebServiceTransportAdapter: Server error:', err);
        reject(err);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.dawaiWsHandler) {
        this.dawaiWsHandler.closeAllConnections();
      }
      if (this.server) {
        this.server.close((err?: Error) => {
          if (err) return reject(err);
          console.log('WebServiceTransportAdapter: Server closed.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private _normalizePath(path: string | undefined): string {
    let fullPath = path || '/';
    if (this.basePath && !fullPath.startsWith('/') && fullPath !== '') {
      fullPath = `${this.basePath.endsWith('/') ? this.basePath : this.basePath + '/'}${fullPath}`;
    } else if (this.basePath && fullPath.startsWith('/')) {
      const effectiveBasePath = this.basePath.endsWith('/') ? this.basePath.slice(0, -1) : this.basePath;
      fullPath = `${effectiveBasePath}${fullPath}`;
    }
    fullPath = fullPath.replace(/\/{2,}/g, '/');
    if (fullPath === '' || fullPath === '//') fullPath = '/';
    return fullPath;
  }

  private _registerHttpHandler(fullPath: string, httpMethod: string, metadata: HandlerMetadata): void {
    if (typeof (this.app as any)[httpMethod] === 'function') {
      console.log(`WebServiceTransportAdapter: Registering HTTP route ${httpMethod.toUpperCase()} ${fullPath} for ${metadata.methodName}`);
      (this.app as any)[httpMethod](
        fullPath,
        async (req: Request, res: Response, nextExpress: NextFunction) => {
          try {
            const result = await this.executeHandler(metadata, req, res, nextExpress);
            if (result !== undefined && !res.headersSent) {
              res.json(result);
            }
          } catch (error) {
            nextExpress(error);
          }
        }
      );
    } else {
      console.warn(`WebServiceTransportAdapter: Invalid HTTP method '${httpMethod}' for ${metadata.methodName} at ${fullPath}`);
    }
  }

  private _registerSseHandler(fullPath: string, httpMethod: string, metadata: HandlerMetadata): void {
    if (typeof (this.app as any)[httpMethod] === 'function') {
      console.log(`WebServiceTransportAdapter: Registering SSE route ${httpMethod.toUpperCase()} ${fullPath} for ${metadata.methodName}`);
      (this.app as any)[httpMethod](fullPath, async (req: Request, res: Response, nextExpress: NextFunction) => {
        try {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders();

          await this.executeHandler(metadata, req, res, nextExpress); // Result is not used here

          req.on('close', () => {
            console.log(`WebServiceTransportAdapter: SSE client disconnected from ${fullPath}`);
            if (!res.writableEnded) {
              res.end();
            }
          });
        } catch (error) {
          console.error(`WebServiceTransportAdapter: Error in SSE route ${fullPath}:`, error);
          if (!res.headersSent) {
            nextExpress(error);
          } else if (!res.writableEnded) {
            res.end();
          }
        }
      });
    } else {
      console.warn(`WebServiceTransportAdapter: Invalid HTTP method '${httpMethod}' for SSE ${metadata.methodName} at ${fullPath}`);
    }
  }

  private _registerWsHandler(metadata: HandlerMetadata): void {
    const eventName = metadata.path;
    if (!eventName) {
      console.warn(`WebServiceTransportAdapter: @ws handler ${metadata.methodName} is missing 'event' (path).`);
      return;
    }
    if (this.dawaiWsHandler) {
      this.dawaiWsHandler.registerWsHandler(eventName, metadata);
    } else {
      console.warn(`WebServiceTransportAdapter: WebSocket handler not initialized. Cannot register event '${eventName}'. Ensure WebSocket is enabled and listen() has been called or is about to be called.`);
    }
  }

  public registerHandler(methodNameKey: string | symbol, metadata: HandlerMetadata): void {
    super.registerHandler(methodNameKey, metadata);

    if (metadata.transportType === TransportType.WEBSERVICE) {
      switch (metadata.decoratorKey) {
        case 'crud':
        case 'rpc': // Assuming RPC and A2A are plain HTTP for now
        case 'a2a':
          if (!metadata.httpMethod) {
            console.warn(`WebServiceTransportAdapter: HTTP method missing for ${metadata.decoratorKey} handler ${metadata.methodName}. Skipping HTTP registration.`);
            return;
          }
          const httpMethod = metadata.httpMethod.toLowerCase();
          const fullPath = this._normalizePath(metadata.path);
          this._registerHttpHandler(fullPath, httpMethod, metadata);
          break;
        case 'ws':
          this._registerWsHandler(metadata);
          break;
        case 'sse':
          const sseHttpMethod = (metadata.httpMethod || 'get').toLowerCase();
          const sseFullPath = this._normalizePath(metadata.path);
          this._registerSseHandler(sseFullPath, sseHttpMethod, metadata);
          break;
        default:
          // This case handles WEBSERVICE transportType but with an unknown decoratorKey for this adapter.
          // It might be an HTTP endpoint if httpMethod is present.
          if (metadata.httpMethod) {
            console.warn(`WebServiceTransportAdapter: Handler ${metadata.methodName} (decorator: ${metadata.decoratorKey}) has WEBSERVICE transport and an httpMethod. Attempting to register as HTTP.`);
            const genericHttpMethod = metadata.httpMethod.toLowerCase();
            const genericFullPath = this._normalizePath(metadata.path);
            this._registerHttpHandler(genericFullPath, genericHttpMethod, metadata);
          } else {
            console.warn(`WebServiceTransportAdapter: Cannot determine how to handle WEBSERVICE decorator '${metadata.decoratorKey}' for method ${metadata.methodName}.`);
          }
          break;
      }
    }
    // else: not a WEBSERVICE transport, so this adapter ignores it.
  }

  protected async executeHandler(
    handlerMetadata: HandlerMetadata,
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    const { handlerFn, parameters, schema, serviceInstance, middleware: handlerMiddleware, decoratorKey } = handlerMetadata;
    const args: any[] = [];

    for (const paramMeta of parameters) {
      switch (paramMeta.type) {
        case ParameterType.BODY: args[paramMeta.index] = req.body; break;
        case ParameterType.PARAMS: args[paramMeta.index] = paramMeta.key ? req.params[paramMeta.key] : req.params; break;
        case ParameterType.QUERY: args[paramMeta.index] = paramMeta.key ? req.query[paramMeta.key] : req.query; break;
        case ParameterType.HEADERS: args[paramMeta.index] = paramMeta.key ? req.headers[paramMeta.key.toLowerCase()] : req.headers; break;
        case ParameterType.COOKIES: args[paramMeta.index] = paramMeta.key ? req.cookies?.[paramMeta.key] : req.cookies; break;
        case ParameterType.SESSION: args[paramMeta.index] = (req as any).session; break;
        case ParameterType.FILES: args[paramMeta.index] = (req as any).files; break;
        case ParameterType.CTX: args[paramMeta.index] = { req, res, next } as WebServiceContext; break;
        case ParameterType.REQUEST: args[paramMeta.index] = req; break;
        case ParameterType.RESPONSE: args[paramMeta.index] = res; break;
        default: args[paramMeta.index] = undefined;
      }
    }

    if (schema && parameters.some(p => p.type === ParameterType.BODY)) {
      const bodyArgIndex = parameters.find(p => p.type === ParameterType.BODY)!.index;
      const validationResult = schema.safeParse(args[bodyArgIndex]);
      if (!validationResult.success) {
        throw validationResult.error;
      }
      args[bodyArgIndex] = validationResult.data;
    }

    // For SSE, the handler itself is responsible for writing to the response stream.
    // The return value of the handler is typically not sent as a JSON response.
    if (decoratorKey === 'sse') {
      await handlerFn.apply(serviceInstance, args);
      return; // Return undefined (or void), _registerSseHandler doesn't use it.
    }

    // For other HTTP-based handlers (crud, rpc, a2a), return the result
    // so _registerHttpHandler can send it as JSON.
    return handlerFn.apply(serviceInstance, args);
  }
}
