import { metadataStorage } from '../metadata.storage';
import {
  McpClientDecoratorOptions,
  McpClientOptions,
  StdioOptions,
  WebserviceOptions,
} from '../interfaces';
import { TransportType } from '../constants';

/**
 * Class decorator to configure a service as an MCP (Model Context Protocol) client.
 * It can also automatically configure an underlying transport (STDIO or Webservice)
 * if specified in the options.
 *
 * @param decoratorOptions Optional partial configuration for the MCP client.
 */
export function McpClient(decoratorOptions?: McpClientDecoratorOptions): ClassDecorator {
  return (target: Function): void => {
    // Default options for McpClient itself
    const defaultMcpClientBehaviorOptions: McpClientOptions = {
      enabled: true,
      // transport and options (McpClientInnerOptions) are truly optional
      // and will be taken from decoratorOptions if provided.
    };

    const effectiveMcpOptions: McpClientOptions = {
      ...defaultMcpClientBehaviorOptions,
      ...(decoratorOptions || {}), // Apply provided partial options
    };

    // Add McpClient specific metadata with the effective options.
    // The key 'mcpClient' will hold its specific configuration.
    metadataStorage.addClassMetadata(target, {
      // configKey: 'webservice', // Removed Key to link to MicroserviceOptions.webservice
      mcpClient: effectiveMcpOptions
    });

    // If MCP client is enabled and a transport is specified, configure it.
    if (effectiveMcpOptions.enabled && effectiveMcpOptions.transport) {
      const innerTransportConfig = effectiveMcpOptions.options; // This is McpClientInnerOptions | undefined

      if (effectiveMcpOptions.transport === TransportType.STDIO) {
        const defaultStdioTransport: StdioOptions = {
          enabled: true, // MCP client enabling STDIO means STDIO itself should be enabled
          options: { interactive: true }, // Default for interactive CLI
        };
        const userStdioTransportConfig = innerTransportConfig?.stdioOptions;
        
        const effectiveStdioOptions: StdioOptions = {
          ...defaultStdioTransport,
          ...userStdioTransportConfig,
          options: { 
            ...(defaultStdioTransport.options), // Known to be an object
            ...(userStdioTransportConfig?.options || {}), // Safely access and spread
          },
          enabled: true, // Explicitly ensure this transport is enabled
        };
        // This adds/overwrites the 'stdio' configuration block in class metadata
        metadataStorage.addClassMetadata(target, { stdio: effectiveStdioOptions });

      } else if (effectiveMcpOptions.transport === TransportType.WEBSERVICE) {
        const defaultWebserviceTransport: WebserviceOptions = {
          enabled: true, // MCP client enabling Webservice means Webservice itself should be enabled
          options: { port: 3000 }, // Default port
        };
        const userWebserviceTransportConfig = innerTransportConfig?.webserviceOptions;

        const effectiveWebserviceOptions: WebserviceOptions = {
          ...defaultWebserviceTransport,
          ...userWebserviceTransportConfig,
          options: {
            ...(defaultWebserviceTransport.options), // Known to be an object
            ...(userWebserviceTransportConfig?.options || {}), // Safely access and spread
          },
          enabled: true, // Explicitly ensure this transport is enabled
        };
        // This adds/overwrites the 'webservice' configuration block in class metadata
        metadataStorage.addClassMetadata(target, { webservice: effectiveWebserviceOptions });
      }
    }
  };
}
