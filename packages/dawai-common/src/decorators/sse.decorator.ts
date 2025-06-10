import { metadataStorage } from '../metadata.storage';
import { TransportType } from '../constants';
import { SseDecoratorOptions } from '../interfaces';
import { 
  DECORATOR_KEY_SSE, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, // SseDecoratorOptions doesn't have schema, but BaseMethodDecoratorOptions might
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as an SSE (Server-Sent Events) handler.
 * Establishes a long-lived HTTP connection for streaming events to the client.
 *
 * @param options Configuration for the SSE decorator.
 */
export function Sse(options: SseDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    // SSE is inherently HTTP-based, so TransportType.WEBSERVICE is fixed.
    const finalTransportType = TransportType.WEBSERVICE;

    const metadataValue = {
      [TRANSPORT_TYPE_METADATA]: finalTransportType,
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_SSE,
      // SseDecoratorOptions does not have a 'schema' property directly.
      // If BaseMethodDecoratorOptions (which SseDecoratorOptions extends) has schema, it would be options.schema.
      // For now, assuming options.schema might exist via extension.
      [SCHEMA_METADATA]: (options as any).schema, 
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      [DECORATOR_KEY_SSE]: metadataValue
    });
  };
}
