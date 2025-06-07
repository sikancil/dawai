import { metadataStorage } from './metadata.storage';
import { ParameterType } from './parameter.options';

export function Params(key?: string): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (propertyKey === undefined) {
      console.warn('@Params decorator used on a constructor parameter, which is not supported for method parameter injection.');
      return;
    }

    const targetConstructor = target.constructor === Function ? target as Function : target.constructor;

    metadataStorage.addParameterMetadata(
      targetConstructor,
      propertyKey as string,
      parameterIndex,
      ParameterType.PARAMS,
      key // Pass the optional key
    );
  };
}
