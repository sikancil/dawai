import { metadataStorage } from './metadata.storage';
import { RpcDecoratorOptions } from '../decorator.options';

/**
 * Decorator to mark a method as an RPC handler.
 *
 * @param options - The RPC decorator options.
 * @returns The method decorator.
 */
export function rpc(options: RpcDecoratorOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    if (!options || !options.command) {
      throw new Error('RPC command must be provided in options.');
    }

    metadataStorage.addMethodMetadata(target.constructor, propertyKey as string, { rpc: options });
  };
}
