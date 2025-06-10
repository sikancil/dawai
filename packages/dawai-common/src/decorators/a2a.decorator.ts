import { metadataStorage } from '../metadata.storage';
import { TransportType } from '../constants';
import { A2aDecoratorOptions } from '../interfaces';
import { 
  DECORATOR_KEY_A2A, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, 
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as an A2A (Agent-to-Agent) command handler.
 *
 * @param options Configuration for the A2A decorator.
 */
export function A2a(options: A2aDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    const finalTransportType = options.transport || TransportType.WEBSERVICE;

    // @A2a typically uses WEBSERVICE (e.g., HTTP for DIDComm).
    if (finalTransportType !== TransportType.WEBSERVICE) {
      console.warn(
        `@A2a decorator on method '${String(methodName)}' typically uses TransportType.WEBSERVICE. ` +
        `The transportType specified in options ('${finalTransportType}') will be used, but ensure it's intended for A2A communication.`
      );
    }

    const metadataValue = {
      [TRANSPORT_TYPE_METADATA]: finalTransportType,
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_A2A,
      [SCHEMA_METADATA]: options.schema, // schema is mandatory for A2aDecoratorOptions
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      [DECORATOR_KEY_A2A]: metadataValue
    });
  };
}
