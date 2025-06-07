import { TransportAdapter } from '../base/transport.adapter';
import { metadataStorage } from '../decorators/metadata.storage';
import { HttpTransportAdapter } from '../transports/http.transport.adapter'; // Import for instanceof check
import { WebserviceDecoratorOptions } from '../decorator.options'; // For type hint

export class Microservice {
  private transportAdapters: Map<TransportAdapter, any> = new Map(); // Stores options passed during registerTransport
  private serviceInstance: any;

  constructor(private serviceClass: { new(...args: any[]): {} }) {
    this.serviceInstance = new this.serviceClass();
  }

  public registerTransport(adapter: TransportAdapter, options?: any): void { // options made optional
    this.transportAdapters.set(adapter, options || {}); // Store empty object if no options
  }

  public async bootstrap(): Promise<void> {
    const classMeta = metadataStorage.getClassMetadata(this.serviceClass);
    const allMethodMeta = metadataStorage.getAllMethodMetadata(this.serviceClass);

    console.log('Bootstrapping Microservice for class:', this.serviceClass.name);
    // console.log('Raw Class Metadata from storage:', classMeta);
    // console.log('Raw Method Metadata from storage:', allMethodMeta);

    for (const [adapter, registeredAdapterOptions] of this.transportAdapters.entries()) {
      let finalAdapterInitOptions = registeredAdapterOptions;

      if (adapter instanceof HttpTransportAdapter && classMeta?.webservice?.options) {
        console.log(`HttpTransportAdapter detected. Prioritizing @webservice decorator options for ${this.serviceClass.name}.`);
        // Merge: decorator options take precedence, then registered options
        finalAdapterInitOptions = { ...registeredAdapterOptions, ...classMeta.webservice.options };
      } else if (classMeta?.stdio?.options /* && adapter instanceof StdioAdapter */) {
        // Example for another potential adapter type
        // console.log('StdioAdapter detected. Prioritizing @stdio decorator options.');
        // finalAdapterInitOptions = { ...registeredAdapterOptions, ...classMeta.stdio.options };
      }
      // Add more else if blocks for other adapter types and their corresponding decorator metadata keys

      // console.log('Final options for adapter.initialize():', finalAdapterInitOptions);
      await adapter.initialize(finalAdapterInitOptions);

      if (allMethodMeta) {
        for (const [methodName, methodMeta] of allMethodMeta.entries()) {
          // console.log(`Registering handler for method '${methodName}' with adapter...`, methodMeta);
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
