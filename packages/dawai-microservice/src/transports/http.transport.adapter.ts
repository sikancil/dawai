import { Application, Request, Response, NextFunction, json, urlencoded } from 'express';
import express from 'express';
import * as http from 'http';
import cors from 'cors';
import { TransportAdapter } from '../base/transport.adapter';
import { WebserviceOptions as FullWebserviceOptions } from '../microservice.options';
import { metadataStorage } from '../decorators/metadata.storage'; // Import MetadataStorage
import { ParameterType } from '../decorators/parameter.options'; // Import ParameterType

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
  }

  async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.app) {
        return reject(new Error('HttpTransportAdapter not initialized. Call initialize() first.'));
      }
      const listenHost = this.host || '0.0.0.0';
      this.server = this.app.listen(this.port, listenHost, () => {
        resolve();
      });
      this.server.on('error', (err) => {
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
                  // TODO: Handle other ParameterTypes (HEADERS, CTX, REQ, RES etc.)
                  default:
                    // console.log(`Arg[${paramMeta.index}] (Unhandled type ${paramMeta.type}): undefined`);
                    args[paramMeta.index] = undefined;
                }
              }
            } else {
              // console.log('No parameter metadata found for this method.');
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
    }
  }
}
