import { metadataStorage } from './metadata.storage';
import { CliDecoratorOptions } from '../decorator.options';

export function cli(options: CliDecoratorOptions): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    if (!options.command) {
      throw new Error(`@cli decorator on ${target.constructor.name}.${String(propertyKey)} must have a 'command' option specified.`);
    }
    metadataStorage.addMethodMetadata(target.constructor, propertyKey as string, {
      cli: options, // Store CliDecoratorOptions under the 'cli' key
    });
  };
}
