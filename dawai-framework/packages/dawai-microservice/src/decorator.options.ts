import { ZodSchema } from 'zod';
import { WebserviceOptions, StdioOptions, McpClientOptions, McpServerOptions, A2aAgentOptions } from './microservice.options'; // Added this line

// @webservice({ ... })
export type WebserviceDecoratorOptions = Partial<WebserviceOptions>;

// @stdio({ ... })
export type StdioDecoratorOptions = Partial<StdioOptions>;

// @mcpClient({ ... })
export type McpClientDecoratorOptions = Partial<McpClientOptions>;

// @mcpServer({ ... })
export type McpServerDecoratorOptions = Partial<McpServerOptions>;

// @a2aAgent({ ... })
export type A2aAgentDecoratorOptions = Partial<A2aAgentOptions>;

interface BaseMethodDecoratorOptions {
  /**
   * If true, this handler will be disabled and not registered.
   * @default false
   */
  disabled?: boolean;
}

// @ws({ event: "...", schema: ... })
export interface WsDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The name of the WebSocket event to handle. */
  event: string;
  /** Optional Zod schema for validating the incoming message body. */
  schema?: ZodSchema<any>;
}

// @cli({ command: "...", schema: ... })
export interface CliDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The CLI command string (e.g., "send_email"). */
  command: string;
  /** Optional Zod schema for validating the command arguments (body). */
  schema?: ZodSchema<any>;
}

// @crud({ endpoint: "...", method: "POST", ... })
export interface CrudDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The API endpoint path (e.g., "/send/email"). */
  endpoint: string;
  /** The HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Optional Zod schema for validating the request body. */
  schema?: ZodSchema<any>;
}

// @rpc({ command: "...", schema: ... })
export interface RpcDecoratorOptions extends BaseMethodDecoratorOptions {
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
  /** The command name for the Model Context Protocol. */
  command: string;
  /** A Zod schema defining the expected payload for the command. */
  schema: ZodSchema<any>;
}

// @a2a({ command: "...", schema: ... })
export interface A2aDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The command name for the Agent-to-Agent protocol. */
  command: string;
  /** A Zod schema defining the expected payload for the command. */
  schema: ZodSchema<any>;
}
