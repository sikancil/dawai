import { metadataStorage } from '../metadata.storage';
import { MiddlewareType } from '../interfaces';

export function useMiddleware(...middlewares: MiddlewareType[]): MethodDecorator {
  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const existingMiddlewares = metadataStorage.getMethodMetadata(target.constructor, propertyKey as string)?.useMiddleware || [];
    metadataStorage.addMethodMetadata(target.constructor, propertyKey as string, {
      useMiddleware: [...existingMiddlewares, ...middlewares], // Append new middlewares
    });
  };
}
