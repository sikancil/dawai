import { ZodSchema } from 'zod'; // Retain ZodSchema if other options use it. CorsOptions and RateLimitOptions are removed as they were specific to WebserviceOptions.

// Main container for all microservice configurations
export interface MicroserviceOptions {
  // webservice?: WebserviceOptions; // This will be imported from the new package if needed at the top level
  stdio?: StdioOptions;
  mcpClient?: McpClientOptions;
  mcpServer?: McpServerOptions;
  a2aAgent?: A2aAgentOptions;
}

// StdioOptions, McpClientOptions, McpServerOptions, A2aAgentOptions remain unchanged below

export interface StdioOptions {
  enabled: boolean;
  options?: {
    interactive?: boolean;
    prompt?: string;
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
