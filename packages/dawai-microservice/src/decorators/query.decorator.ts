import { metadataStorage } from './metadata.storage';
import { ParameterType } from './parameter.options';

export function Query(key?: string): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (propertyKey === undefined) {
      console.warn('@Query decorator used on a constructor parameter, which is not supported for method parameter injection.');
      return;
    }

    const targetConstructor = target.constructor === Function ? target as Function : target.constructor;

    metadataStorage.addParameterMetadata(
      targetConstructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.QUERY,
      key // Pass the optional key
    );
  };
}
