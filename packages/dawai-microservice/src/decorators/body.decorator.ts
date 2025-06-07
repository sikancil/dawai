import { metadataStorage } from './metadata.storage';
import { ParameterType } from './parameter.options';

export function Body(): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (propertyKey === undefined) {
      // This case should not happen for parameter decorators on methods,
      // but good to guard. propertyKey is undefined for constructor params.
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
