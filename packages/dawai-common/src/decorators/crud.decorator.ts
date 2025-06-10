import { metadataStorage } from '../metadata.storage';
import { TransportType } from '../constants';
import { CrudDecoratorOptions } from '../interfaces';
import { 
  DECORATOR_KEY_CRUD, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, 
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as a CRUD operation handler.
 * Typically used for RESTful APIs over HTTP.
 *
 * @param options Configuration for the CRUD decorator.
 */
export function Crud(options: CrudDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    const finalTransportType = options.transport || TransportType.WEBSERVICE;

    // Ensure the transport type is WEBSERVICE for @Crud, as it's HTTP-based.
    if (finalTransportType !== TransportType.WEBSERVICE) {
      console.warn(
        `@Crud decorator on method '${String(methodName)}' implies TransportType.WEBSERVICE. ` +
        `The transportType specified in options ('${finalTransportType}') is unusual for @Crud and will be used, but ensure it's intended.`
      );
      // Unlike @Cli, @Crud might be theoretically used with a custom transport that mimics HTTP.
      // However, its primary design is for WEBSERVICE.
    }

    const metadataValue = {
      [TRANSPORT_TYPE_METADATA]: finalTransportType,
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_CRUD,
      [SCHEMA_METADATA]: options.schema,
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options 
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      [DECORATOR_KEY_CRUD]: metadataValue
    });
  };
}
