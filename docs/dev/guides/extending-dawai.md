# Extending Dawai

Dawai is designed with extensibility in mind, allowing developers to adapt and enhance the framework to suit specific needs. This guide provides an overview of common extension points, such as creating custom transport adapters, parameter decorators, or even new method/class decorators.

## Core Extensibility Principles

*   **Modular Design**: Dawai's packages and components are loosely coupled, making it easier to replace or add new functionalities.
*   **Decorator-Based Metadata**: The use of decorators allows for rich metadata collection, which custom components can leverage.
*   **Abstract Base Classes and Interfaces**: Key components like `TransportAdapter` provide abstract base classes that custom implementations can extend.

## 1. Creating Custom Transport Adapters

A transport adapter is responsible for bridging a specific communication protocol (e.g., gRPC, MQTT, custom TCP protocol) with Dawai's core microservice logic.

**Steps to Create a Custom Transport Adapter:**

1.  **Define Configuration**: Determine what configuration options your adapter will need. These can be added to `MicroserviceOptions` and corresponding class/method decorator options.
    ```typescript
    // e.g., in dawai-common/interfaces/microservice-options.interface.ts (if contributing to core)
    // or in your custom package
    export interface MyCustomTransportOptions {
      enabled: boolean;
      options: {
        port?: number;
        customSetting?: string;
        // ... other settings
      };
    }
    // And in MicroserviceOptions:
    // myCustomTransport?: MyCustomTransportOptions;
    ```

2.  **Extend `TransportAdapter`**: Create a class that extends `AbstractTransportAdapter` from `@arifwidianto/dawai-microservice`.
    ```typescript
    // src/adapters/MyCustomTransportAdapter.ts
    import {
      AbstractTransportAdapter,
      HandlerMetadata,
      MicroserviceOptions,
      ParameterMetadata,
      ServiceInstance,
    } from '@arifwidianto/dawai-microservice'; // Adjust imports based on actual exports
    import { MyCustomTransportOptions } from '../interfaces/my-custom-transport.options'; // Your options type

    export class MyCustomTransportAdapter extends AbstractTransportAdapter<MyCustomTransportOptions> {
      private server: any; // Your underlying server instance (e.g., gRPC server, MQTT client)

      constructor(
        protected readonly microserviceOptions: MicroserviceOptions,
        protected readonly serviceInstance: ServiceInstance
      ) {
        super(microserviceOptions, serviceInstance, 'myCustomTransport'); // 'myCustomTransport' is key in MicroserviceOptions
      }

      async bootstrap(): Promise<void> {
        if (!this.isEnabled()) {
          console.log('MyCustomTransportAdapter is disabled.');
          return;
        }
        console.log('Bootstrapping MyCustomTransportAdapter...');
        // Initialize your server/client based on this.config.options
        // e.g., this.server = new MyUnderlyingServer(this.config.options);

        // Discover relevant handlers from the service instance
        const handlers = this.getHandlersByTransport(this.transportName); // or a custom decorator name
        for (const handlerMeta of handlers) {
          this.registerHandler(handlerMeta);
        }
      }

      protected registerHandler(handlerMeta: HandlerMetadata): void {
        const { methodName, handlerFn, options } = handlerMeta;
        const pathOrCommand = options.path || options.command; // Based on your decorator

        console.log(`[MyCustomTransport] Registering handler: ${methodName} for path/command: ${pathOrCommand}`);

        // Logic to make handlerFn callable via your protocol
        // e.g., this.server.on(pathOrCommand, async (incomingData, replyFn) => { ... });
        // Inside the protocol-specific callback:
        //   1. Extract parameters based on ParameterMetadata
        //   2. Call handlerFn.apply(this.serviceInstance, extractedArgs)
        //   3. Send the result back using replyFn or similar
      }

      async listen(): Promise<void> {
        if (!this.isEnabled() || !this.server) return;
        // Start listening for incoming connections/messages
        // e.g., this.server.listen(this.config.options.port);
        console.log(`MyCustomTransportAdapter listening on port ${this.config.options.port}`);
      }

      async close(): Promise<void> {
        if (!this.isEnabled() || !this.server) return;
        // Gracefully shut down your server/client
        // e.g., await this.server.close();
        console.log('MyCustomTransportAdapter closed.');
      }

      // Optional: Implement parameter extraction logic
      protected async extractParameters(
        handlerMeta: HandlerMetadata,
        // Protocol-specific request/message object
        incomingContext: any
      ): Promise<any[]> {
        const args: any[] = [];
        const paramMetas = this.getParamsForHandler(handlerMeta.methodName);

        for (const paramMeta of paramMetas) {
          // Logic to extract value based on paramMeta.decoratorName, paramMeta.key, etc.
          // from incomingContext
          // args[paramMeta.index] = extractedValue;
        }
        return args;
      }
    }
    ```

3.  **Define Decorators (Optional but Recommended)**: Create method decorators (e.g., `@MyCustomHandler()`) and parameter decorators (e.g., `@MyCustomPayload()`) in `@arifwidianto/dawai-common` (or your custom package) to mark and configure handlers for your transport. These decorators will store metadata that your adapter's `registerHandler` and `extractParameters` methods will use.

4.  **Register the Adapter**:
    ```typescript
    // src/index.ts
    import { Microservice } from '@arifwidianto/dawai-microservice';
    import { MyService } from './services/MyService.service';
    import { MyCustomTransportAdapter } from './adapters/MyCustomTransportAdapter';
    import { MicroserviceOptions } from '@arifwidianto/dawai-common';

    async function bootstrap() {
      const options: MicroserviceOptions = {
        myCustomTransport: { // Matches the key used in the adapter constructor
          enabled: true,
          options: { port: 7000, customSetting: 'foo' }
        }
      };
      const app = new Microservice(MyService, options);

      // Manual registration if not auto-detected via class decorators
      app.registerTransport(new MyCustomTransportAdapter(options, app.getServiceInstance()));

      await app.bootstrap();
      await app.listen();
    }
    bootstrap();
    ```
    Alternatively, if you create a class decorator (e.g., `@enableMyCustomTransport()`), the `Microservice` class might auto-register your adapter if it's discoverable (e.g., by naming convention or explicit mapping).

## 2. Creating Custom Parameter Decorators

Parameter decorators allow you to inject specific data into your handler methods.

**Steps to Create a Custom Parameter Decorator:**

1.  **Define the Decorator Factory**:
    ```typescript
    // src/decorators/MyCustomParam.decorator.ts
    // (Typically would live in @arifwidianto/dawai-common or a shared package)
    import 'reflect-metadata';
    import { PARAMETER_METADATA_KEY } from '@arifwidianto/dawai-common'; // Or your constant
    import { ParameterMetadata } from '@arifwidianto/dawai-microservice'; // Or your type

    export const MY_CUSTOM_PARAM_DECORATOR = 'custom:myparam';

    export function MyCustomParam(customKey?: string): ParameterDecorator {
      return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
        const existingParameters: ParameterMetadata[] =
          Reflect.getOwnMetadata(PARAMETER_METADATA_KEY, target, propertyKey) || [];

        existingParameters.push({
          index: parameterIndex,
          methodName: propertyKey as string,
          decoratorName: MY_CUSTOM_PARAM_DECORATOR,
          key: customKey, // Optional key or data for the decorator
          // type: Reflect.getMetadata('design:paramtypes', target, propertyKey)[parameterIndex] // Get type if needed
        });

        Reflect.defineMetadata(PARAMETER_METADATA_KEY, existingParameters, target, propertyKey);
      };
    }
    ```

2.  **Use in Handler**:
    ```typescript
    // In your service
    class MyService {
      // @MyCustomHandler(...) // Assuming a handler decorator for your custom transport
      async handleIt(@MyCustomParam('someValue') data: string) {
        console.log('Received via MyCustomParam:', data);
      }
    }
    ```

3.  **Process in Transport Adapter**: Your custom transport adapter's `extractParameters` method would then look for `ParameterMetadata` with `decoratorName === MY_CUSTOM_PARAM_DECORATOR` and use the `key` to extract the relevant data from the incoming request/message.

## 3. Creating Custom Method or Class Decorators

Similar to parameter decorators, you can create custom method or class decorators to attach metadata for various purposes (e.g., enabling features, configuring behavior).
*   **Method Decorators**: Store metadata using `Reflect.defineMetadata` with a unique key on `target[propertyKey]`. Your transport adapter or other parts of the framework can then retrieve this metadata.
*   **Class Decorators**: Store metadata on `target` (the class constructor).

Refer to how existing decorators like `@Crud`, `@Cli`, `@webservice`, `@stdio` are implemented in `@arifwidianto/dawai-common` for patterns.

## 4. Custom Middleware

As covered in the [Middleware guide](./middleware.md), you can create custom middleware classes or functions. These are particularly useful for `WebServiceTransportAdapter` (Express-based) but can be conceptually applied to other transports if the adapter supports a middleware pipeline.

## 5. Contributing to Core Packages

If your extension is broadly applicable and aligns with Dawai's goals, consider contributing it to the core Dawai packages. This involves:
*   Following the contribution guidelines of the project.
*   Writing thorough tests.
*   Documenting your extension.
*   Submitting a pull request.

## Considerations for Extensions

*   **Clarity and Purpose**: Ensure your extension has a clear purpose and integrates well with the existing framework.
*   **Configuration**: Provide clear configuration options.
*   **Documentation**: Document how to use and configure your extension.
*   **Testing**: Write comprehensive tests for your extension.
*   **Impact on Performance**: Be mindful of any performance implications your extension might introduce.

Dawai's extensible nature empowers developers to tailor the framework to a wide array of use cases beyond its out-of-the-box capabilities.
