import { ZodSchema } from 'zod';
import { WebserviceOptions } from './microservice.options';
import { BaseMethodDecoratorOptions } from '@arifwidianto/dawai-common';

// @webservice({ ... })
export type WebserviceDecoratorOptions = Partial<WebserviceOptions>;

// @crud({ endpoint: "...", method: "POST", ... })
export interface CrudDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The API endpoint path (e.g., "/send/email"). */
  endpoint: string;
  /** The HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Optional Zod schema for validating the request body. */
  schema?: ZodSchema<any>;
}

// @ws({ event: "...", schema: ... }) - Retaining for WebServiceTransportAdapter
export interface WsDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The name of the WebSocket event to handle. */
  event: string;
  /** Optional Zod schema for validating the incoming message body. */
  schema?: ZodSchema<any>;
}

// @sse({ endpoint: "...", method: "POST" }) - Retaining for WebServiceTransportAdapter
export interface SseDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The endpoint path for establishing the SSE connection or posting events. */
  endpoint: string;
  /** The HTTP method used for the SSE endpoint. */
  method?: 'GET' | 'POST';
}
