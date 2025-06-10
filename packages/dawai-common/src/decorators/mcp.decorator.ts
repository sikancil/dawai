import { metadataStorage } from '../metadata.storage';
import { TransportType } from '../constants';
import { McpDecoratorOptions } from '../interfaces';
import { 
  DECORATOR_KEY_MCP, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, 
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as an MCP (Model Context Protocol) command handler.
 *
 * @param options Configuration for the MCP decorator.
 */
export function Mcp(options: McpDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    const finalTransportType = options.transport || TransportType.STDIO;

    // @Mcp typically uses STDIO.
    if (finalTransportType !== TransportType.STDIO) {
      console.warn(
        `@Mcp decorator on method '${String(methodName)}' typically uses TransportType.STDIO. ` +
        `The transportType specified in options ('${finalTransportType}') will be used, but ensure it's intended for MCP.`
      );
    }

    const metadataValue = {
      [TRANSPORT_TYPE_METADATA]: finalTransportType,
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_MCP,
      [SCHEMA_METADATA]: options.schema, // schema is mandatory for McpDecoratorOptions
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      [DECORATOR_KEY_MCP]: metadataValue
    });
  };
}
