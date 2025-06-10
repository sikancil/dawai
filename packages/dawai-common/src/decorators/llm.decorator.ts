import { metadataStorage } from '../metadata.storage';
import { LlmDecoratorOptions } from '../interfaces';
// Import TransportType if it becomes part of LlmDecoratorOptions or if a default is decided
// import { TransportType } from '../constants'; 
import { 
  DECORATOR_KEY_LLM, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, 
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as an LLM (Large Language Model) tool.
 * This method can be called by an LLM as part of its function/tool calling capability.
 *
 * @param options Configuration for the LLM tool decorator.
 */
export function Llm(options: LlmDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    // LlmDecoratorOptions currently does not have a 'transport' field.
    // If it were added, it would be:
    // const finalTransportType = (options as any).transport || undefined; 
    // For now, it's undefined.
    const finalTransportType = (options as any).transport;


    const metadataValue = {
      // If LlmDecoratorOptions is updated to include `transport?: TransportType`, use it here.
      // Otherwise, this will be undefined, and the Microservice core or LLM adapter
      // will need to determine how to handle it.
      [TRANSPORT_TYPE_METADATA]: finalTransportType, 
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_LLM,
      [SCHEMA_METADATA]: options.schema, // schema is mandatory for LlmDecoratorOptions
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      [DECORATOR_KEY_LLM]: metadataValue
    });
  };
}
