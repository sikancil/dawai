import { StdioOptions } from "child_process";
import { A2aAgentOptions } from "./a2a-agent.options.interface";
import { McpClientOptions } from "./mcp-client.options.interface";
import { McpServerOptions } from "./mcp-server.options.interface";
import { WebserviceOptions } from "./webservice.options.interface";

// --- Class Decorator Options ---

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
