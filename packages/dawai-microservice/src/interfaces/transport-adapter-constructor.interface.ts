import { MicroserviceOptions } from '@arifwidianto/dawai-common';
import { TransportAdapter } from '../core/transport.adapter';

export interface TransportAdapterConstructor {
  new(
    microserviceOptions: MicroserviceOptions,
    serviceInstance: any,
    globalMiddleware?: any[]
  ): TransportAdapter;
  // static readonly configKey?: string; // Add if Microservice class directly accesses static properties like this
}
