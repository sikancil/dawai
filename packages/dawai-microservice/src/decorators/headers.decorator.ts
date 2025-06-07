import { metadataStorage } from './metadata.storage';
import { ParameterType } from './parameter.options';

export function Headers(headerName?: string): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      (typeof target === 'function' ? target : target.constructor) as Function,
      propertyKey ? String(propertyKey) : '',
      parameterIndex,
      ParameterType.HEADERS,
      headerName
    );
  };
}
