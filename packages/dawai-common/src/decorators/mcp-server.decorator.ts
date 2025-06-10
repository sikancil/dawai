import { metadataStorage } from '../metadata.storage';
import {
  McpServerDecoratorOptions,
  McpServerOptions,
  StdioOptions,
  WebserviceOptions,
} from '../interfaces';
import { TransportType } from '../constants';

/**
 * Class decorator to configure a service as an MCP (Model Context Protocol) server.
 * It can also automatically configure an underlying transport (STDIO or Webservice)
 * if specified in the options.
 *
 * @param decoratorOptions Optional partial configuration for the MCP server.
 */
export function McpServer(decoratorOptions?: McpServerDecoratorOptions): ClassDecorator {
  return (target: Function): void => {
    // Default options for McpServer itself
    const defaultMcpServerBehaviorOptions: McpServerOptions = {
      enabled: true,
      // transport, details, and options (McpServerTransportOptions) are truly optional
    };

    const effectiveMcpServerOptions: McpServerOptions = {
      ...defaultMcpServerBehaviorOptions,
      ...(decoratorOptions || {}), // Apply provided partial options
    };

    // Add McpServer specific metadata with the effective options.
    // The key 'mcpServer' will hold its specific configuration.
    metadataStorage.addClassMetadata(target, {
      // configKey: 'webservice', // Removed Key to link to MicroserviceOptions.webservice
      mcpServer: effectiveMcpServerOptions
    });

    // If MCP server is enabled and a transport is specified, configure it.
    if (effectiveMcpServerOptions.enabled && effectiveMcpServerOptions.transport) {
      // The 'options' field in McpServerOptions holds McpServerTransportOptions
      const innerTransportConfig = effectiveMcpServerOptions.options; 

      if (effectiveMcpServerOptions.transport === TransportType.STDIO) {
        const defaultStdioTransport: StdioOptions = {
          enabled: true, 
          options: { interactive: true }, 
        };
        const userStdioTransportConfig = innerTransportConfig?.stdioOptions;
        
        const effectiveStdioOptions: StdioOptions = {
          ...defaultStdioTransport,
          ...userStdioTransportConfig,
          options: { 
            ...(defaultStdioTransport.options), 
            ...(userStdioTransportConfig?.options || {}), 
          },
          enabled: true, 
        };
        metadataStorage.addClassMetadata(target, { stdio: effectiveStdioOptions });

      } else if (effectiveMcpServerOptions.transport === TransportType.WEBSERVICE) {
        const defaultWebserviceTransport: WebserviceOptions = {
          enabled: true, 
          options: { port: 3000 }, 
        };
        const userWebserviceTransportConfig = innerTransportConfig?.webserviceOptions;

        const effectiveWebserviceOptions: WebserviceOptions = {
          ...defaultWebserviceTransport,
          ...userWebserviceTransportConfig,
          options: {
            ...(defaultWebserviceTransport.options), 
            ...(userWebserviceTransportConfig?.options || {}), 
          },
          enabled: true, 
        };
        metadataStorage.addClassMetadata(target, { webservice: effectiveWebserviceOptions });
      }
    }
  };
}
