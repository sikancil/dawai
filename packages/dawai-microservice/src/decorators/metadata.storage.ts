export class MetadataStorage {
  private static instance: MetadataStorage;
  private classMetadata: Map<Function, any> = new Map();
  private methodMetadata: Map<Function, Map<string, any>> = new Map();

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
}

export const metadataStorage = MetadataStorage.getInstance();
