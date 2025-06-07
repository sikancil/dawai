import { metadataStorage } from './metadata.storage';
import { A2aDecoratorOptions } from '../decorator.options';

/**
 * Decorator to mark a method as an A2A handler.
 *
 * @param options - The A2A decorator options.
 * @returns The method decorator.
 */
export function a2a(options: A2aDecoratorOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    if (!options || !options.command || !options.schema) {
      throw new Error(`@a2a decorator on ${String(propertyKey)} must have 'command' and 'schema' options specified.`);
    }

    metadataStorage.addMethodMetadata(target.constructor, propertyKey as string, { a2a: options });
  };
}
