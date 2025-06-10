import { CrudDecoratorOptions, metadataStorage } from '@arifwidianto/dawai-common';

export function crud(options: CrudDecoratorOptions): MethodDecorator {
  return function<T> (
    target: any, 
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T> 
  ): TypedPropertyDescriptor<T> | void {
    const constructorFunction = (typeof target === 'function' ? target : target.constructor) as Function;
    metadataStorage.addMethodMetadata(constructorFunction, propertyKey as string, { crud: options });
  };
}
