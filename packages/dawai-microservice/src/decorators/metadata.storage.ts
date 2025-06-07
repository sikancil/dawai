import { ParameterDecoratorMetadata, ParameterType } from './parameter.options';

export class MetadataStorage {
  private static instance: MetadataStorage;
  private classMetadata: Map<Function, any> = new Map();
  private methodMetadata: Map<Function, Map<string, any>> = new Map();
  // New storage for parameter metadata
  private parameterMetadata: Map<Function, Map<string, ParameterDecoratorMetadata[]>> = new Map();

  private constructor() {} // Private constructor for singleton

  public static getInstance(): MetadataStorage {
    if (!MetadataStorage.instance) {
      MetadataStorage.instance = new MetadataStorage();
    }
    return MetadataStorage.instance;
  }

  public addClassMetadata(target: Function, metadata: any): void {
    const existingMetadata = this.classMetadata.get(target) || {};
    this.classMetadata.set(target, { ...existingMetadata, ...metadata });
  }

  public addMethodMetadata(targetConstructor: Function, propertyKey: string, metadata: any): void {
    if (!this.methodMetadata.has(targetConstructor)) {
      this.methodMetadata.set(targetConstructor, new Map<string, any>());
    }
    const methods = this.methodMetadata.get(targetConstructor)!;
    const existingMetadata = methods.get(propertyKey) || {};
    methods.set(propertyKey, { ...existingMetadata, ...metadata });
  }

  public getClassMetadata(target: Function): any | undefined {
    return this.classMetadata.get(target);
  }

  public getMethodMetadata(targetConstructor: Function, propertyKey: string): any | undefined {
    const methods = this.methodMetadata.get(targetConstructor);
    return methods ? methods.get(propertyKey) : undefined;
  }

  public getAllMethodMetadata(targetConstructor: Function): Map<string, any> | undefined {
    return this.methodMetadata.get(targetConstructor);
  }

  // New methods for parameter metadata
  public addParameterMetadata(
    targetConstructor: Function,
    methodName: string,
    parameterIndex: number,
    type: ParameterType,
    key?: string
  ): void {
    if (!this.parameterMetadata.has(targetConstructor)) {
      this.parameterMetadata.set(targetConstructor, new Map<string, ParameterDecoratorMetadata[]>());
    }
    const methodParamsMap = this.parameterMetadata.get(targetConstructor)!;

    if (!methodParamsMap.has(methodName)) {
      methodParamsMap.set(methodName, []);
    }
    const paramsList = methodParamsMap.get(methodName)!;

    // Remove if metadata for this specific parameter index already exists, then add the new one.
    // This ensures that if a decorator is somehow applied multiple times (though unusual for params), the last one wins.
    const existingParamIndex = paramsList.findIndex(p => p.index === parameterIndex);
    if (existingParamIndex !== -1) {
      paramsList.splice(existingParamIndex, 1);
    }
    paramsList.push({ index: parameterIndex, type, key });
  }

  public getParameterMetadata(targetConstructor: Function, methodName: string): ParameterDecoratorMetadata[] | undefined {
    const methodParamsMap = this.parameterMetadata.get(targetConstructor);
    if (methodParamsMap) {
      const paramsList = methodParamsMap.get(methodName);
      if (paramsList) {
        // Return a sorted copy to ensure order without modifying the original stored array
        return [...paramsList].sort((a, b) => a.index - b.index);
      }
    }
    return undefined;
  }
}

export const metadataStorage = MetadataStorage.getInstance();
