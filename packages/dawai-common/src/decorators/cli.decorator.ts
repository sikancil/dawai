import { metadataStorage } from '../metadata.storage';
import { TransportType } from '../constants';
import { CliDecoratorOptions } from '../interfaces';
import { 
  DECORATOR_KEY_CLI, 
  TRANSPORT_TYPE_METADATA, 
  DECORATOR_KEY_METADATA, 
  SCHEMA_METADATA, 
  DISABLED_METADATA,
  HANDLER_OPTIONS_METADATA
} from '../constants/metadata.keys';

/**
 * Decorator for marking a method as a CLI command handler.
 *
 * @param options Configuration for the CLI decorator.
 */
export function Cli(options: CliDecoratorOptions): MethodDecorator {
  return function (target: Object, methodName: string | symbol, descriptor: PropertyDescriptor): void {
    // For @Cli, transportType is fixed to STDIO.
    // The `options.transportType` field in CliDecoratorOptions should ideally not exist or be ignored if @Cli is strictly STDIO.
    // If it can be something else, then this decorator isn't just "@Cli" but a more generic one.
    // Assuming @Cli is always STDIO as per its name and typical usage.
    if (options.transport && options.transport !== TransportType.STDIO) {
      console.warn(
        `@Cli decorator on method '${String(methodName)}' implies TransportType.STDIO. ` +
        `The transportType specified in options ('${options.transport}') will be ignored, and STDIO will be used.`
      );
    }

    const metadataValue = {
      [TRANSPORT_TYPE_METADATA]: TransportType.STDIO, // Fixed for @Cli
      [DECORATOR_KEY_METADATA]: DECORATOR_KEY_CLI,    // Unique key for this decorator type
      [SCHEMA_METADATA]: options.schema,
      [DISABLED_METADATA]: options.disabled || false,
      [HANDLER_OPTIONS_METADATA]: options // The full original options object
    };

    metadataStorage.addMethodMetadata(target.constructor, methodName as string, {
      // Store the above metadata object under the unique key for @Cli decorator applications
      [DECORATOR_KEY_CLI]: metadataValue 
    });
  };
}
