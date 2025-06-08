import { metadataStorage } from './metadata.storage';
import { ParameterType } from '@arifwidianto/dawai-common';

export function Ctx(): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      (typeof target === 'function' ? target : target.constructor) as Function,
      propertyKey ? String(propertyKey) : '',
      parameterIndex,
      ParameterType.CTX
    );
  };
}
