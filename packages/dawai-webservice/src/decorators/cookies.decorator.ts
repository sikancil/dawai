import { ParameterType, metadataStorage } from '@arifwidianto/dawai-common';

export function Cookies(cookieName?: string): ParameterDecorator {
  return function (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) {
    metadataStorage.addParameterMetadata(
      (typeof target === 'function' ? target : target.constructor) as Function,
      propertyKey ? String(propertyKey) : '',
      parameterIndex,
      ParameterType.COOKIES,
      cookieName
    );
  };
}
