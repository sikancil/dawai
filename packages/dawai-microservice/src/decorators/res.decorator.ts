import { metadataStorage } from './metadata.storage';
import { ParameterType } from './parameter.options';

export function Res(): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      target.constructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.RES
    );
  };
}
