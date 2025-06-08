import { WebserviceDecoratorOptions } from '../decorator.options';
import { metadataStorage } from '@arifwidianto/dawai-microservice';

export function webservice(options: WebserviceDecoratorOptions): ClassDecorator {
  return (target: Function) => {
    metadataStorage.addClassMetadata(target, { webservice: options });
  };
}
