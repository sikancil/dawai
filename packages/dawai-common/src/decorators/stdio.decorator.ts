import { metadataStorage } from '../metadata.storage';
import { StdioDecoratorOptions } from '../interfaces';

/**
 * Class decorator to enable and configure STDIO transport for a service.
 * This is typically used for CLI-based services.
 * The options provided are a partial configuration for the STDIO transport.
 *
 * @param options Optional configuration for the STDIO transport.
 */
export function stdio(options?: StdioDecoratorOptions): ClassDecorator {
  return function (target: Function): void {
    metadataStorage.addClassMetadata(target, {
      configKey: 'stdio', // Key to link to MicroserviceOptions.stdio
      options: options || {}, // Ensure options is always an object
    });
  };
}
