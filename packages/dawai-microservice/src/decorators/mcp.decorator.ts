import { metadataStorage } from './metadata.storage';
import { McpDecoratorOptions } from '../decorator.options';

/**
 * Decorator to mark a method as an MCP handler.
 *
 * @param options - The MCP decorator options.
 * @returns The method decorator.
 */
export function mcp(options: McpDecoratorOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    if (!options || !options.command || !options.schema) {
      throw new Error(`@mcp decorator on ${String(propertyKey)} must have 'command' and 'schema' options specified.`);
    }

    metadataStorage.addMethodMetadata(target.constructor, propertyKey as string, { mcp: options });
  };
}
