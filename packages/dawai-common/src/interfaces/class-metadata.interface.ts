import { WebserviceOptions } from './webservice.options.interface';
import { StdioOptions } from './stdio.options.interface';
// Import other class decorator option types if they exist and are part of class metadata
// For example, if @mcpServer or @a2aAgent store class-level metadata:
// import { McpServerOptions } from './mcp-server.options.interface';
// import { A2aAgentOptions } from './a2a-agent.options.interface';


/**
 * Represents the metadata collected from class decorators.
 * Each key corresponds to a class decorator (e.g., 'webservice', 'stdio').
 */
export interface ClassMetadata {
  webservice?: WebserviceOptions;
  stdio?: StdioOptions;
  // mcpServer?: McpServerOptions;
  // a2aAgent?: A2aAgentOptions;
  // Add other potential class-level decorator metadata keys here
  [key: string]: any; // Allow other arbitrary keys for extensibility
}
