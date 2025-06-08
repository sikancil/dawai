import { metadataStorage } from '@arifwidianto/dawai-microservice';
import { ParameterType } from '@arifwidianto/dawai-common';

export function Headers(headerName?: string): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      target.constructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.HEADERS,
      headerName
    );
  };
}
