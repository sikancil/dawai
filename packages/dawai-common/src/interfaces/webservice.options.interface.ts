import { CorsOptions } from "cors";

// NOTE: express-rate-limit Options might be too specific for common, consider a generic RateLimitOptions or Partial<any>
// For now, let's use a placeholder if the direct import is an issue or not desired in 'common'
// import { Options as RateLimitOptions } from 'express-rate-limit';

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
      options?: CorsOptions; // from 'cors'
    };
    security?: {
      rateLimit?: {
        enabled: boolean;
        options?: Record<string, any>; // Was Partial<RateLimitOptions>
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
      enabled?: boolean; // Added based on example usage
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
