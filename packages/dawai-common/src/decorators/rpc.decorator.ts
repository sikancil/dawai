import { metadataStorage } from '../metadata.storage';
import { TransportType } from '../constants';
import { RpcDecoratorOptions } from '../interfaces';
import { 
  DECORATOR_KEY_RPC, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, 
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as an RPC (Remote Procedure Call) handler.
 * Typically used for JSON-RPC or similar protocols, often over HTTP.
 *
 * @param options Configuration for the RPC decorator.
 */
export function Rpc(options: RpcDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    const finalTransportType = options.transport || TransportType.WEBSERVICE;

    // @Rpc is typically for JSON-RPC over HTTP, which falls under WEBSERVICE transport.
    if (finalTransportType !== TransportType.WEBSERVICE) {
      console.warn(
        `@Rpc decorator on method '${String(methodName)}' implies TransportType.WEBSERVICE. ` +
        `The transportType specified in options ('${finalTransportType}') is unusual for @Rpc and will be used, but ensure it's intended.`
      );
    }

    const metadataValue = {
      [TRANSPORT_TYPE_METADATA]: finalTransportType,
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_RPC,
      [SCHEMA_METADATA]: options.schema,
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      [DECORATOR_KEY_RPC]: metadataValue
    });
  };
}
