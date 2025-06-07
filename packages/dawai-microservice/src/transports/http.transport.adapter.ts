import { Application, Request, Response, NextFunction, json, urlencoded } from 'express';
// import * as expressLogging from 'express'; // Commented out as default import is preferred and used
import express from 'express';
// import * as httpLogging from 'http'; // http is a core module, namespace import is fine.
import * as http from 'http';
// import * as corsLogging from 'cors'; // Commented out as default import is preferred and used
import cors from 'cors';
import { TransportAdapter } from '../base/transport.adapter';
import { WebserviceOptions as FullWebserviceOptions } from '../microservice.options';

type HttpServerOptions = FullWebserviceOptions['options'];

export class HttpTransportAdapter extends TransportAdapter {
  private app!: Application;
  private server!: http.Server;
  private port: number = 3000;
  private host?: string;
  private basePath: string = ''; // Added for base path

  constructor() {
    super();
  }

  async initialize(options: HttpServerOptions): Promise<void> {
    this.app = express(); // Default import usage
    this.port = options.port || 3000;
    this.host = options.host;
    // Initialize basePath from the main webservice options, specifically from crud options if available
    this.basePath = options.crud?.options?.basePath || '';

    this.app.use(json());
    this.app.use(urlencoded({ extended: true }));

    if (options.cors?.enabled) {
      this.app.use(options.cors.options ? cors(options.cors.options) : cors()); // Default import usage
    }
    console.log('HttpTransportAdapter: Initialized with options:', options);
  }

  async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.app) {
        return reject(new Error('HttpTransportAdapter not initialized. Call initialize() first.'));
      }
      const listenHost = this.host || '0.0.0.0';
      this.server = this.app.listen(this.port, listenHost, () => {
        console.log(`HttpTransportAdapter: Server listening on ${listenHost}:${this.port}`);
        resolve();
      });
      this.server.on('error', (err) => {
        console.error('HttpTransportAdapter: Server failed to start:', err);
        reject(err);
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            console.error('HttpTransportAdapter: Error closing server:', err);
            return reject(err);
          }
          console.log('HttpTransportAdapter: Server closed.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  registerHandler(methodName: string, metadata: any): void {
    if (metadata && metadata.crud) {
      const crudOptions = metadata.crud;
      const httpMethod = crudOptions.method.toLowerCase();

      // Normalize basePath: remove trailing slash, default to '' if it was '/'
      let normBasePath = this.basePath;
      if (normBasePath.endsWith('/')) {
        normBasePath = normBasePath.slice(0, -1);
      }

      // Normalize endpointPath: remove leading slash
      let normEndpointPath = crudOptions.endpoint || '';
      if (normEndpointPath.startsWith('/')) {
        normEndpointPath = normEndpointPath.substring(1);
      }

      let fullPath = '';
      if (normBasePath && normEndpointPath) {
        fullPath = `${normBasePath}/${normEndpointPath}`;
      } else if (normBasePath) {
        fullPath = normBasePath;
      } else if (normEndpointPath) {
        fullPath = `/${normEndpointPath}`; // Ensure leading slash if only endpoint
      } else {
        fullPath = '/'; // Default to root if both are empty
      }

      // Ensure fullPath always starts with a slash if it's not just an empty string (which becomes '/')
      if (fullPath !== '/' && !fullPath.startsWith('/')) {
        fullPath = '/' + fullPath;
      }


      if (typeof (this.app as any)[httpMethod] === 'function') {
        console.log(`HttpTransportAdapter: Registering [CRUD] ${httpMethod.toUpperCase()} ${fullPath} for handler ${methodName}`);
        (this.app as any)[httpMethod](fullPath, (req: Request, res: Response, next: NextFunction) => {
          console.log(`HttpTransportAdapter: Route ${httpMethod.toUpperCase()} ${fullPath} matched for handler ${methodName}`);
          // Placeholder: Actual method invocation and parameter handling will be in a later step.
          res.json({
            message: 'Handler matched (placeholder response)',
            route: fullPath,
            httpMethod: httpMethod.toUpperCase(),
            handlerMethod: methodName
          });
        });
      } else {
        console.warn(`HttpTransportAdapter: Invalid HTTP method '${httpMethod}' for handler ${methodName} at ${fullPath}`);
      }
    } else {
      // console.log(`HttpTransportAdapter: No CRUD metadata for handler ${methodName}. Skipping HTTP route registration.`);
    }
  }
}
