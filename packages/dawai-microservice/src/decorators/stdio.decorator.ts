import { metadataStorage } from './metadata.storage';
import { StdioDecoratorOptions } from '../decorator.options';

export function stdio(options: StdioDecoratorOptions): ClassDecorator {
  return (target: Function) => {
    metadataStorage.addClassMetadata(target, {
      stdio: options, // Store StdioDecoratorOptions under the 'stdio' key
    });
  };
}
