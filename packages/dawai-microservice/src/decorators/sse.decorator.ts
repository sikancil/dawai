import { metadataStorage } from './metadata.storage';
import { SseDecoratorOptions } from '../decorator.options';

export function sse(options: SseDecoratorOptions): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    metadataStorage.addMethodMetadata(target.constructor, propertyKey as string, {
      sse: options, // Store SseDecoratorOptions under the 'sse' key
    });
  };
}
