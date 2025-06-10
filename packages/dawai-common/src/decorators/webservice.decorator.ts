import { metadataStorage } from '../metadata.storage';
import { WebserviceDecoratorOptions } from '../interfaces';

/**
 * Class decorator to enable and configure webservice transport for a service.
 * The options provided are a partial configuration for the webservice transport,
 * which will be merged with global or default settings.
 *
 * @param options Optional configuration for the webservice transport.
 */
export function webservice(options?: WebserviceDecoratorOptions): ClassDecorator {
  return function (target: Function): void {
    metadataStorage.addClassMetadata(target, {
      configKey: 'webservice', // Key to link to MicroserviceOptions.webservice
      options: options || {}, // Ensure options is always an object
    });
  };
}
