// dawai-framework/packages/dawai-microservice/src/lib/utils/metadata-utils.ts
import 'reflect-metadata';
import type { Microservice } from '../microservice'; // Adjusted to only import Microservice for type, not the private method
import type { MethodRegistryEntry, DecoratorMetadata, MethodHandler } from '../microservice';
import {
  LLM_TOOL_METADATA_KEY,
  MCP_METHOD_METADATA_KEY,
  A2A_METHOD_METADATA_KEY,
  REST_ENDPOINT_METADATA_KEY
} from '../decorators/constants';
import type { LLMToolOptions, MCPMethodOptions, A2AMethodOptions, RestEndpointOptions } from '../decorators/method-decorators';

export function discoverAndRegisterMethods(serviceInstance: any, microservice: Microservice): void {
  if (!serviceInstance || typeof serviceInstance !== 'object' || serviceInstance === null) {
    console.warn('discoverAndRegisterMethods: serviceInstance must be a valid object.');
    return;
  }
  if (!microservice || !(microservice instanceof Object) || !('_registerMethodEntry' in microservice)) { // Basic check for microservice
    console.warn('discoverAndRegisterMethods: microservice instance is invalid or does not have _registerMethodEntry.');
    return;
  }

  const prototype = Object.getPrototypeOf(serviceInstance);
  if (!prototype || prototype === Object.prototype) {
    console.warn('discoverAndRegisterMethods: Could not get a valid prototype of serviceInstance or it is Object.prototype.');
    return;
  }

  Object.getOwnPropertyNames(prototype).forEach(propertyName => {
    if (propertyName === 'constructor') {
      return;
    }

    const propertyDescriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (propertyDescriptor && typeof propertyDescriptor.value === 'function') {
      const method = propertyDescriptor.value as MethodHandler;
      let compiledDecorators: DecoratorMetadata = {};
      let hasMetadata = false;

      // Retrieve metadata for each known decorator type
      const llmToolOpts = Reflect.getMetadata(LLM_TOOL_METADATA_KEY, prototype, propertyName) as LLMToolOptions | undefined;
      if (llmToolOpts) {
        compiledDecorators.llmTool = llmToolOpts;
        hasMetadata = true;
      }

      const mcpMethodOpts = Reflect.getMetadata(MCP_METHOD_METADATA_KEY, prototype, propertyName) as MCPMethodOptions | undefined;
      if (mcpMethodOpts) {
        compiledDecorators.mcpMethod = mcpMethodOpts;
        hasMetadata = true;
      }

      const a2aMethodOpts = Reflect.getMetadata(A2A_METHOD_METADATA_KEY, prototype, propertyName) as A2AMethodOptions | undefined;
      if (a2aMethodOpts) {
        compiledDecorators.a2aMethod = a2aMethodOpts;
        hasMetadata = true;
      }

      const restEndpointOpts = Reflect.getMetadata(REST_ENDPOINT_METADATA_KEY, prototype, propertyName) as RestEndpointOptions | undefined;
      if (restEndpointOpts) {
        compiledDecorators.restEndpoint = restEndpointOpts;
        hasMetadata = true;
      }

      // If any decorator metadata was found, create and register the method entry
      if (hasMetadata) {
        const entry: MethodRegistryEntry = {
          name: propertyName, // MethodRegistryEntry.name is the propertyName (actual method name in class)
          handler: method.bind(serviceInstance), // Bind the method to the instance
          decorators: compiledDecorators,
        };

        // Call the microservice's internal registration method
        // Type assertion to access the private method, as per instructions for the worker
        (microservice as any)._registerMethodEntry(entry);
        
        // Optional: Log the registration for debugging or confirmation
        // console.log(`Method '${propertyName}' from class '${prototype.constructor.name}' registered with decorators:`, compiledDecorators);
      }
    }
  });
}
