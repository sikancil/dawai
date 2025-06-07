import { metadataStorage } from '../metadata.storage';
import { ParameterType } from './parameter.options';

export function Session(): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      target.constructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.SESSION
    );
  };
}
