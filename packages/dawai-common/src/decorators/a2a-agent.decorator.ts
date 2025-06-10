import { metadataStorage } from '../metadata.storage';
import {
  A2aAgentDecoratorOptions,
  A2aAgentOptions,
  StdioOptions,
  WebserviceOptions,
} from '../interfaces';
import { TransportType } from '../constants';

/**
 * Class decorator to configure a service as an A2A (Agent-to-Agent) agent.
 * It can also automatically configure an underlying transport (STDIO or Webservice)
 * if specified in the options.
 *
 * @param decoratorOptions Optional partial configuration for the A2A agent.
 */
export function A2aAgent(decoratorOptions?: A2aAgentDecoratorOptions): ClassDecorator {
  return (target: Function): void => {
    // Default options for A2aAgent itself
    const defaultA2aAgentBehaviorOptions: A2aAgentOptions = {
      enabled: true,
      // transport, details, and options (A2aAgentTransportOptions) are truly optional
    };

    const effectiveA2aAgentOptions: A2aAgentOptions = {
      ...defaultA2aAgentBehaviorOptions,
      ...(decoratorOptions || {}), // Apply provided partial options
    };

    // Add A2aAgent specific metadata with the effective options.
    // The key 'a2aAgent' will hold its specific configuration.
    metadataStorage.addClassMetadata(target, {
      // configKey: 'webservice', // Removed Key to link to MicroserviceOptions.webservice
      a2aAgent: effectiveA2aAgentOptions
    });

    // If A2A agent is enabled and a transport is specified, configure it.
    if (effectiveA2aAgentOptions.enabled && effectiveA2aAgentOptions.transport) {
      // The 'options' field in A2aAgentOptions holds A2aAgentTransportOptions
      const innerTransportConfig = effectiveA2aAgentOptions.options; 

      if (effectiveA2aAgentOptions.transport === TransportType.STDIO) {
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

      } else if (effectiveA2aAgentOptions.transport === TransportType.WEBSERVICE) {
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
