import { CliDecoratorOptions } from '@arifwidianto/dawai-common';
import { METHOD_METADATA, PATH_METADATA, TRANSPORT_TYPE_METADATA, TransportType } from '@arifwidianto/dawai-common';

/**
 * Method decorator to define a CLI command handler.
 * @param options Configuration for the CLI command.
 */
export function cli(options: CliDecoratorOptions): MethodDecorator {
  return (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PATH_METADATA, options.command, descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, 'CLI_COMMAND', descriptor.value); // Specific marker for CLI commands
    Reflect.defineMetadata(TRANSPORT_TYPE_METADATA, TransportType.STDIO, descriptor.value);
    if (options.schema) {
      Reflect.defineMetadata('cli:schema', options.schema, descriptor.value);
    }
    if (options.disabled) {
      Reflect.defineMetadata('cli:disabled', true, descriptor.value);
    }
  };
}
