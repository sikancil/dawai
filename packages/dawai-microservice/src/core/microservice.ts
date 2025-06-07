import { TransportAdapter } from '../base/transport.adapter';
import { metadataStorage } from '../decorators/metadata.storage';
import { HttpTransportAdapter } from '../transports/http.transport.adapter'; // Import for instanceof check

// Define a clearer constructor signature for service classes  
interface ServiceClass {  
  new(...args: any[]): any;  
} 

export class Microservice {
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

    // console.log('Bootstrapping Microservice for class:', this.serviceClass.name);

    for (const [adapter, registeredAdapterOptions] of this.transportAdapters.entries()) {
      let finalAdapterInitOptions = registeredAdapterOptions;

      if (adapter instanceof HttpTransportAdapter && classMeta?.webservice?.options) {
        // console.log(`HttpTransportAdapter detected. Prioritizing @webservice decorator options for ${this.serviceClass.name}.`);
        finalAdapterInitOptions = { ...registeredAdapterOptions, ...classMeta.webservice.options };
      }
      // Add more else if blocks for other adapter types

      await adapter.initialize(finalAdapterInitOptions);

      if (allMethodMeta) {
        for (const [methodName, methodMeta] of allMethodMeta.entries()) {
          if (typeof this.serviceInstance[methodName] === 'function') {
            const handlerFn = (this.serviceInstance[methodName] as Function).bind(this.serviceInstance);
            // console.log(`Passing handler for method '${methodName}' to adapter...`);
            adapter.registerHandler(methodName, methodMeta, handlerFn, this.serviceInstance);
          } else {
            // console.warn(`Warning: Method '${methodName}' not found on service instance or is not a function.`);
          }
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
