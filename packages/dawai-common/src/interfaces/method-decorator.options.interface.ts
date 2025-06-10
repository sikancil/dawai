import { ZodSchema } from 'zod';
import { BaseMethodDecoratorOptions } from './base-method-decorator-options.interface';
import { TransportType } from '../constants';

// --- Method Decorator Options ---

// @ws({ event: "...", schema: ... })
export interface WsDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The transport type, defaults to WEBSERVICE. */
  transport?: TransportType;
  /** The name of the WebSocket event to handle. */
  event: string;
  /** Optional Zod schema for validating the incoming message body. */
  schema?: ZodSchema<any>;
}

// @cli({ command: "...", schema: ... })
export interface CliDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The transport type, defaults to STDIO. */
  transport?: TransportType;
  /** The CLI command string (e.g., "send_email"). */
  command: string;
  /** The command short name, used for alias or abbreviated CLI command. */
  short?: string;
  /** The command description, used for help output. */
  description?: string;
  /** Optional Zod schema for validating the command arguments (body). */
  schema?: ZodSchema<any>;
}

// @crud({ endpoint: "...", method: "POST", ... })
export interface CrudDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The transport type, defaults to WEBSERVICE. */
  transport?: TransportType;
  /** The API endpoint path (e.g., "/send/email"). */
  endpoint: string;
  /** The HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Optional Zod schema for validating the request body. */
  schema?: ZodSchema<any>;
}

// @rpc({ command: "...", schema: ... })
export interface RpcDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The transport type, defaults to WEBSERVICE. */
  transport?: TransportType;
  /** The name of the JSON-RPC method. */
  command: string;
  /** Optional Zod schema for validating the RPC parameters. */
  schema?: ZodSchema<any>;
}

// @sse({ endpoint: "...", method: "POST" })
export interface SseDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The endpoint path for establishing the SSE connection or posting events. */
  endpoint: string;
  /** The HTTP method used for the SSE endpoint. */
  method?: 'GET' | 'POST';
}

// @llm({ tool: "...", schema: ... })
export interface LlmDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The name of the tool/function to be exposed to the LLM. */
  tool: string;
  /** A Zod schema defining the arguments for the tool, used for validation and generation. */
  schema: ZodSchema<any>;
}

// @mcp({ command: "...", schema: ... })
export interface McpDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The transport type, defaults to STDIO. */
  transport?: TransportType;
  /** The command name for the Model Context Protocol. */
  command: string;
  /** A Zod schema defining the expected payload for the command. */
  schema: ZodSchema<any>;
}

// @a2a({ command: "...", schema: ... })
export interface A2aDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The transport type, defaults to WEBSERVICE. */
  transport?: TransportType;
  /** The command name for the Agent-to-Agent protocol. */
  command: string;
  /** A Zod schema defining the expected payload for the command. */
  schema: ZodSchema<any>;
}
