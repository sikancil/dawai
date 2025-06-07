import { metadataStorage } from '../metadata.storage';
import { ParameterType } from './parameter.options';

export function Headers(headerName?: string): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      target.constructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.HEADERS,
      headerName
    );
  };
}
