import { Application, Request, Response, NextFunction, json, urlencoded } from 'express';
import express from 'express';
import * as http from 'http';
import cors from 'cors';
import { TransportAdapter } from '../base/transport.adapter';
import { WebserviceOptions as FullWebserviceOptions } from '../microservice.options';

type HttpServerOptions = FullWebserviceOptions['options'];

export class HttpTransportAdapter extends TransportAdapter {
  private app!: Application;
  private server!: http.Server;
  private port: number = 3000;
  private host?: string;
  private basePath: string = '';

  constructor() {
    super();
  }

  async initialize(options: HttpServerOptions): Promise<void> {
    this.app = express();
    this.port = options.port || 3000;
    this.host = options.host;
    this.basePath = options.crud?.options?.basePath || '';

    this.app.use(json());
    this.app.use(urlencoded({ extended: true }));

    if (options.cors?.enabled) {
      this.app.use(options.cors.options ? cors(options.cors.options) : cors());
    }
    // console.log('HttpTransportAdapter: Initialized with options:', options);
  }

  async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.app) {
        return reject(new Error('HttpTransportAdapter not initialized. Call initialize() first.'));
      }
      const listenHost = this.host || '0.0.0.0';
      this.server = this.app.listen(this.port, listenHost, () => {
        // console.log(`HttpTransportAdapter: Server listening on ${listenHost}:${this.port}`);
        resolve();
      });
      this.server.on('error', (err) => {
        // console.error('HttpTransportAdapter: Server failed to start:', err);
        reject(err);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            // console.error('HttpTransportAdapter: Error closing server:', err);
            return reject(err);
          }
          // console.log('HttpTransportAdapter: Server closed.');
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
            // console.log(`HttpTransportAdapter: Route ${httpMethod.toUpperCase()} ${fullPath} matched. Calling ${serviceInstance.constructor.name}.${methodName}`);
            // For now, call without arguments. Parameter injection is for a later step.
            const result = await handlerFn(); // handlerFn is the bound service method

            // console.log(`Result from ${serviceInstance.constructor.name}.${methodName}: `, result);
            if (res.headersSent) {
              console.warn(`HttpTransportAdapter: Headers already sent for route ${fullPath}, cannot send result.`);
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
              // If headers already sent, pass to Express default error handler
              next(error);
            }
          }
        });
      } else {
        console.warn(`HttpTransportAdapter: Invalid HTTP method '${httpMethod}' for ${methodName} at ${fullPath}`);
      }
    }
  }
}
