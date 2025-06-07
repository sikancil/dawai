import { CrudDecoratorOptions } from '../decorator.options';
import { metadataStorage } from './metadata.storage';

export function crud(options: CrudDecoratorOptions): MethodDecorator {
  return function<T> (
    target: any, // Reverted to 'any' to see if it resolves signature mismatch
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    const constructorFunction = (typeof target === 'function' ? target : target.constructor) as Function;
    metadataStorage.addMethodMetadata(constructorFunction, propertyKey as string, { crud: options });
  };
}
