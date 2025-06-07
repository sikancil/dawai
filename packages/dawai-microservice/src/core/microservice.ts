import { TransportAdapter } from '../base/transport.adapter';
import { metadataStorage } from '../decorators/metadata.storage';
// HttpTransportAdapter import is no longer needed for instanceof check here

// Define a clearer constructor signature for service classes  
interface ServiceClass {  
  new(...args: any[]): any;  
} 

export class Microservice {
  // Stores adapter instance against its constructor-passed options
  private transportAdapters: Map<TransportAdapter, any> = new Map();
  private serviceInstance: any;

  constructor(private serviceClass: ServiceClass) {
    this.serviceInstance = new this.serviceClass();
  }

  public registerTransport(adapter: TransportAdapter, options?: any): void {
    this.transportAdapters.set(adapter, options || {});
  }

  public async bootstrap(): Promise<void> {
    const classMeta = metadataStorage.getClassMetadata(this.serviceClass);
    const allMethodMeta = metadataStorage.getAllMethodMetadata(this.serviceClass);

    // console.log('Bootstrapping Microservice for class:', this.serviceClass.name, 'Class Meta:', classMeta);

    for (const [adapter, registeredAdapterOptions] of this.transportAdapters.entries()) {
      const adapterConstructor = adapter.constructor as any;
      const configKey = adapterConstructor.configKey as string | undefined;
      let effectiveOptions = registeredAdapterOptions; // Start with options from registerTransport

      // console.log(`Processing adapter: ${adapterConstructor.name}, ConfigKey: ${configKey}, Registered options:`, registeredAdapterOptions);

      if (configKey && classMeta && classMeta[configKey]) {
        const decoratorConfig = classMeta[configKey]; // This is e.g. WebserviceDecoratorOptions or StdioDecoratorOptions

        // console.log(`Decorator config found for key '${configKey}':`, decoratorConfig);

        if (decoratorConfig.enabled === false) {
          console.log(`Transport for ${configKey} disabled by class decorator for ${this.serviceClass.name}. Skipping initialization.`);
          continue; // Skip initializing and registering handlers for this adapter for this service.
        }

        // Merge options: decoratorConfig overrides registeredAdapterOptions.
        // The structure of both is { enabled?: boolean, options?: object }
        effectiveOptions = {
          ...registeredAdapterOptions, // Base
          ...decoratorConfig,          // Decorator defined values (like 'enabled') override base
          options: {                   // Deep merge for the 'options' sub-object
            ...(registeredAdapterOptions?.options || {}),
            ...(decoratorConfig.options || {})
          }
        };
        // console.log(`Effective options for ${adapterConstructor.name} after merge:`, effectiveOptions);
      } else {
        // console.log(`No decorator config for ${configKey} on ${this.serviceClass.name}, or configKey not defined on adapter.`);
        // If no decorator, check if registeredAdapterOptions itself disables the adapter
        if (registeredAdapterOptions?.enabled === false) {
            console.log(`Transport for ${adapterConstructor.name} disabled by registered options for ${this.serviceClass.name}. Skipping initialization.`);
            continue;
        }
      }

      // Initialize the adapter with the determined effective options.
      // The adapter's initialize method should handle its 'enabled' state internally if further checks are needed.
      // console.log(`Initializing ${adapterConstructor.name} with options:`, effectiveOptions);
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
