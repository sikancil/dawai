import { ParameterType, metadataStorage } from '@arifwidianto/dawai-common';

export function Body(): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (propertyKey === undefined) {
      console.warn('@Body decorator used on a constructor parameter, which is not supported for method body injection.');
      return;
    }

    const targetConstructor = target.constructor === Function ? target as new (...args: any[]) => any : target.constructor;

    metadataStorage.addParameterMetadata(
      targetConstructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.BODY
    );
  };
}
