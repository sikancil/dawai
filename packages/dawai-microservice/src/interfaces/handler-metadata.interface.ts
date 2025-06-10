import { ZodSchema } from 'zod';
import { TransportType, ParameterType } from '@arifwidianto/dawai-common';

export interface ParameterMetadata {
  index: number;
  type: ParameterType; // Use the enum type
  key?: string; // For specific query, param, header, cookie names
  // schema?: ZodSchema<any>; // Optional schema for individual parameters
}

export interface HandlerMetadata {
  methodName: string;
  handlerFn: Function;
  serviceInstance: any;
  transportType?: TransportType; // e.g., HTTP, WS, STDIO - Made optional
  options?: Record<string, any>; // Additional options for the handler
  path?: string; // Command for CLI, endpoint for HTTP, event name for WS
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; // For HTTP transport
  schema?: ZodSchema<any>; // For request body/payload validation
  parameters: ParameterMetadata[];
  middleware?: any[]; // Handler-specific middleware, changed from any[] to any[] based on DevGuides.md example
  isStream?: boolean; // For SSE or streaming responses
  disabled?: boolean;
  decoratorKey?: string; // The original decorator key (e.g., 'crud', 'ws', 'sse')
}
