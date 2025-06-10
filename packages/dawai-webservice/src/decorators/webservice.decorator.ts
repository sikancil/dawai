import { WebserviceDecoratorOptions, metadataStorage } from '@arifwidianto/dawai-common';

export function webservice(options: WebserviceDecoratorOptions): ClassDecorator {
  return (target: Function) => {
    metadataStorage.addClassMetadata(target, { webservice: options });
  };
}
