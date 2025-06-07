import { metadataStorage } from './metadata.storage';
import { WsDecoratorOptions } from '../decorator.options';

export function ws(options: WsDecoratorOptions): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    metadataStorage.addMethodMetadata(target.constructor, propertyKey as string, {
      ws: options, // Store WsDecoratorOptions under the 'ws' key
    });
  };
}
