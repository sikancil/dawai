import { CorsOptions } from 'cors';
import { Options as RateLimitOptions } from 'express-rate-limit';

// Transport-level configuration for Webservice
export interface WebserviceOptions {
  enabled: boolean;
  options: {
    port?: number;
    host?: string;
    https?: {
      enabled: boolean;
      options: {
        key: string;
        cert: string;
        ca?: string;
        passphrase?: string;
      };
    };
    cors?: {
      enabled: boolean;
      options?: CorsOptions;
    };
    security?: {
      rateLimit?: {
        enabled: boolean;
        options?: Partial<RateLimitOptions>;
      };
      defaultHeaders?: Record<string, string>;
      trustProxy?: boolean;
    };
    bodyParser?: {
      json?: any;
      urlencoded?: any;
      text?: any;
      maxBodySize?: string;
    };
    logging?: {
      enabled: boolean;
      options?: {
        format?: string;
        level?: 'info' | 'warn' | 'error';
      };
    };
    performance?: {
      requestTimeout?: number;
      sseKeepAliveIntervalMs?: number;
    };
    websocket?: {
      path?: string;
      options?: any; // e.g., ws.ServerOptions
    };
    crud?: {
      enabled?: boolean;
      options?: {
        basePath?: string;
      };
    };
    sse?: {
      enabled?: boolean;
      options?: {
        basePath?: string;
      };
    };
    rpc?: {
      enabled?: boolean;
      options?: {
        basePath?: string;
      };
    };
  };
}
