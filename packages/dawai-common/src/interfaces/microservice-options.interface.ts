import { WebserviceOptions } from './webservice.options.interface';
import { StdioOptions } from './stdio.options.interface';
import { McpClientOptions } from './mcp-client.options.interface';
import { A2aAgentOptions } from './a2a-agent.options.interface';
import { McpServerOptions } from './mcp-server.options.interface';

// Main container for all microservice configurations
export interface MicroserviceOptions {
  webservice?: WebserviceOptions;
  stdio?: StdioOptions;
  mcpClient?: McpClientOptions;
  mcpServer?: McpServerOptions;
  a2aAgent?: A2aAgentOptions;
}
