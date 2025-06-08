import { ZodSchema } from 'zod';
// WebserviceOptions import removed as WebserviceDecoratorOptions is removed.
import { StdioOptions, McpClientOptions, McpServerOptions, A2aAgentOptions } from './microservice.options';
import { BaseMethodDecoratorOptions } from '@arifwidianto/dawai-common';

// @stdio({ ... })
export type StdioDecoratorOptions = Partial<StdioOptions>;

// @mcpClient({ ... })
export type McpClientDecoratorOptions = Partial<McpClientOptions>;

// @mcpServer({ ... })
export type McpServerDecoratorOptions = Partial<McpServerOptions>;

// @a2aAgent({ ... })
export type A2aAgentDecoratorOptions = Partial<A2aAgentOptions>;

// @cli({ command: "...", schema: ... })
export interface CliDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The CLI command string (e.g., "send_email"). */
  command: string;
  /** Optional Zod schema for validating the command arguments (body). */
  schema?: ZodSchema<any>;
  /** Optional description for the CLI command, used for help messages. */
  description?: string;
}

// @rpc({ command: "...", schema: ... })
export interface RpcDecoratorOptions extends BaseMethodDecoratorOptions {
  /** The name of the JSON-RPC method. */
  command: string;
  /** Optional Zod schema for validating the RPC parameters. */
  schema?: ZodSchema<any>;
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
