import { TransportAdapter } from '../base/transport.adapter';
import { metadataStorage } from '../decorators/metadata.storage';
import { WebserviceDecoratorOptions } from '../decorator.options'; // For potential use

export class Microservice {
  private transportAdapters: Map<TransportAdapter, any> = new Map();
  private serviceInstance: any;

  constructor(private serviceClass: { new(...args: any[]): {} }) {
    // Instantiate the service class to access its methods if needed by handlers later
    this.serviceInstance = new this.serviceClass();
  }

  public registerTransport(adapter: TransportAdapter, options: any): void {
    this.transportAdapters.set(adapter, options);
  }

  public async bootstrap(): Promise<void> {
    const classMeta = metadataStorage.getClassMetadata(this.serviceClass);
    const allMethodMeta = metadataStorage.getAllMethodMetadata(this.serviceClass);

    // console.log('Bootstrapping Microservice...');
    // console.log('Class Metadata:', classMeta);
    // console.log('All Method Metadata:', allMethodMeta);

    for (const [adapter, adapterOptions] of this.transportAdapters.entries()) {
      // Potentially merge classMeta transport specific options with adapterOptions
      // For example, if classMeta has webservice options and adapter is HttpAdapter.
      // This part needs more sophisticated logic later.
      // For now, just use the options provided when registering the transport.
      await adapter.initialize(adapterOptions);

      if (allMethodMeta) {
        for (const [methodName, methodMeta] of allMethodMeta.entries()) {
          // TODO: Add logic to filter/transform metadata for specific adapter types.
          // For now, pass raw methodMeta. The adapter's registerHandler will need to understand it.
          // console.log(`Registering handler for method ${methodName} with adapter...`, methodMeta);
          adapter.registerHandler(methodName, methodMeta);
        }
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

  public close(): Promise<void[]> {
    const closePromises: Promise<void>[] = [];
    for (const adapter of this.transportAdapters.keys()) {
      closePromises.push(adapter.close());
    }
    return Promise.all(closePromises);
  }
}
