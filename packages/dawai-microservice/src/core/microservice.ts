import { TransportAdapter } from '../base/transport.adapter';
import { metadataStorage } from '../decorators/metadata.storage';
import { MicroserviceOptions } from '../microservice.options';

// Define a clearer constructor signature for service classes
interface ServiceClass {
  new(...args: any[]): any;
}

export class Microservice {
  // Stores adapter instance against its constructor-passed options
  private transportAdapters: Map<TransportAdapter, any> = new Map();
  private serviceInstance: any;
  private microserviceConstructorOptions?: MicroserviceOptions;

  constructor(private serviceClass: ServiceClass, microserviceConstructorOptions?: MicroserviceOptions) {
    this.serviceInstance = new this.serviceClass();
    this.microserviceConstructorOptions = microserviceConstructorOptions;
  }

  public registerTransport(adapter: TransportAdapter, options?: any): void {
    this.transportAdapters.set(adapter, options || {});
  }

  public async bootstrap(): Promise<void> {
    const classMeta = metadataStorage.getClassMetadata(this.serviceClass);
    const allMethodMeta = metadataStorage.getAllMethodMetadata(this.serviceClass);

    for (const [adapter, optionsFromRegisterTransport] of this.transportAdapters.entries()) {
      const adapterConstructor = adapter.constructor as any;
      const configKey = adapterConstructor.configKey as string | undefined;
      let baseConfig: any;

      if (configKey && this.microserviceConstructorOptions && (this.microserviceConstructorOptions as any)[configKey] !== undefined) {
        baseConfig = (this.microserviceConstructorOptions as any)[configKey];
      } else {
        baseConfig = optionsFromRegisterTransport;
      }

      let effectiveOptions = baseConfig;
      const decoratorConfig = (configKey && classMeta && classMeta[configKey]) ? classMeta[configKey] : undefined;

      if (decoratorConfig) {
        if (decoratorConfig.enabled === false) {
          console.log(`Transport for ${configKey} disabled by class decorator for ${this.serviceClass.name}. Skipping initialization.`);
          continue;
        }
        effectiveOptions = {
          ...baseConfig,
          ...decoratorConfig,
          options: {
            ...(baseConfig?.options || {}),
            ...(decoratorConfig.options || {}),
          },
        };
      } else {
        // No decorator config, check if baseConfig itself disables the adapter
        if (baseConfig?.enabled === false) {
          console.log(`Transport for ${configKey || adapterConstructor.name} disabled by constructor/registered options for ${this.serviceClass.name}. Skipping initialization.`);
          continue;
        }
      }

      // Final check on effectiveOptions before initializing
      if (effectiveOptions?.enabled === false) {
        console.log(`Transport for ${configKey || adapterConstructor.name} ultimately disabled for ${this.serviceClass.name}. Skipping initialization.`);
        continue;
      }

      await adapter.initialize(effectiveOptions);

      // Register method handlers with this adapter
      if (allMethodMeta) {
        for (const [methodName, methodMeta] of allMethodMeta.entries()) {
          // Check if this method has metadata relevant to the current adapter's configKey or if it's a generic handler
          // For example, methodMeta.cli, methodMeta.crud, methodMeta.ws, methodMeta.sse
          // The adapter's registerHandler should be smart enough to ignore irrelevant methods based on methodMeta.
          if (typeof this.serviceInstance[methodName] === 'function') {
            const handlerFn = (this.serviceInstance[methodName] as Function).bind(this.serviceInstance);
            adapter.registerHandler(methodName, methodMeta, handlerFn, this.serviceInstance);
          }
        }
      }
    }

    // Call onModuleInit if defined on the service instance
    if (typeof this.serviceInstance.onModuleInit === 'function') {
      try {
        console.log(`Calling onModuleInit for ${this.serviceClass.name}`);
        await this.serviceInstance.onModuleInit();
      } catch (error) {
        console.error(`Error during onModuleInit for ${this.serviceClass.name}:`, error);
        // Depending on desired behavior, you might want to rethrow or handle gracefully
        throw error; // Re-throw to make it visible that bootstrap failed
      }
    }
  }

  public listen(): Promise<void[]> {
    const listenPromises: Promise<void>[] = [];
    for (const adapter of this.transportAdapters.keys()) {
      listenPromises.push(adapter.listen());
    }
    return Promise.all(listenPromises);
  }

  public async close(): Promise<void[]> {
    // Call onApplicationShutdown if defined on the service instance
    if (typeof this.serviceInstance.onApplicationShutdown === 'function') {
      try {
        console.log(`Calling onApplicationShutdown for ${this.serviceClass.name}`);
        await this.serviceInstance.onApplicationShutdown();
      } catch (error) {
        console.error(`Error during onApplicationShutdown for ${this.serviceClass.name}:`, error);
        // Log error but continue with closing adapters
      }
    }

    const closePromises: Promise<void>[] = [];
    for (const adapter of this.transportAdapters.keys()) {
      closePromises.push(adapter.close());
    }
    return Promise.all(closePromises);
  }
}
