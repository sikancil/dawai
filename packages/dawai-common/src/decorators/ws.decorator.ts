import { metadataStorage } from '../metadata.storage';
import { TransportType } from '../constants';
import { WsDecoratorOptions } from '../interfaces';
import { 
  DECORATOR_KEY_WS, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, 
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as a WebSocket event handler.
 *
 * @param options Configuration for the WebSocket decorator.
 */
export function Ws(options: WsDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    const finalTransportType = options.transport || TransportType.WEBSERVICE;

    // @Ws is typically for WebSockets, which fall under WEBSERVICE transport.
    if (finalTransportType !== TransportType.WEBSERVICE) {
      console.warn(
        `@Ws decorator on method '${String(methodName)}' implies TransportType.WEBSERVICE. ` +
        `The transportType specified in options ('${finalTransportType}') is unusual for @Ws and will be used, but ensure it's intended.`
      );
    }

    const metadataValue = {
      [TRANSPORT_TYPE_METADATA]: finalTransportType,
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_WS,
      [SCHEMA_METADATA]: options.schema,
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      [DECORATOR_KEY_WS]: metadataValue
    });
  };
}
