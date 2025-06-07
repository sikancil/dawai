import { CorsOptions } from 'cors';
import { Options as RateLimitOptions } from 'express-rate-limit';
import { ZodSchema } from 'zod';

// Main container for all microservice configurations
export interface MicroserviceOptions {
  webservice?: WebserviceOptions;
  stdio?: StdioOptions;
  mcpClient?: McpClientOptions;
  mcpServer?: McpServerOptions;
  a2aAgent?: A2aAgentOptions;
}

// Transport-level configuration
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

export interface StdioOptions {
  enabled: boolean;
  options?: {
    interactive?: boolean;
  };
}

export interface McpClientOptions {
  enabled: boolean;
  registry: () => Promise<any> | any;
  options?: any;
}

export interface McpServerOptions {
  enabled: boolean;
  transport: 'stdio' | 'http' | string;
  options?: {
    name: string;
    description?: string;
    version?: string;
  };
}

export interface A2aAgentOptions {
  enabled: boolean;
  transport: 'http' | string;
  options?: {
    metadata: any;
  };
}
