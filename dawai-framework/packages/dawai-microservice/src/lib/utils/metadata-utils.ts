// dawai-framework/packages/dawai-microservice/src/lib/utils/metadata-utils.ts
import 'reflect-metadata';

export function getMethodMetadata<T>(metadataKey: symbol, target: any, propertyKey: string): T | undefined {
    return Reflect.getMetadata(metadataKey, target, propertyKey) as T | undefined;
}
