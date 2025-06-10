import { ParameterType, metadataStorage } from '@arifwidianto/dawai-common';

export function Res(): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      target.constructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.RESPONSE
    );
  };
}
