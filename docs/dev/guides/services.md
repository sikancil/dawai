# Defining Services in Dawai

In the Dawai framework, **Services** are the core building blocks of your application. They are TypeScript classes that encapsulate a related set of functionalities or business logic. Methods within these service classes can be exposed as handlers for various communication protocols (like HTTP, CLI commands, WebSocket events) using decorators.

## What is a Service Class?

A service class is a standard TypeScript class. You organize your application's logic into methods within these classes.

```typescript
// src/services/MyFeatureService.service.ts

export class MyFeatureService {
  private dataStore: string[] = [];

  // This method contains business logic
  addItem(item: string): string {
    this.dataStore.push(item);
    return `Item "${item}" added. Total items: ${this.dataStore.length}`;
  }

  // Another method
  getItem(index: number): string | undefined {
    return this.dataStore[index];
  }
}
```
At this point, `MyFeatureService` is just a regular class. To integrate it with the Dawai framework and expose its methods, you'll use decorators.

## The `Microservice` Class

The `@arifwidianto/dawai-microservice` package provides the `Microservice` class. This class is the main orchestrator for your Dawai application. You instantiate it with your primary service class (or an array of service classes).

```typescript
// src/index.ts
import 'reflect-metadata';
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MyFeatureService } from './services/MyFeatureService.service';
import { MicroserviceOptions } from '@arifwidianto/dawai-common';

async function bootstrap() {
  const options: MicroserviceOptions = { /* ... your configurations ... */ };
  const app = new Microservice(MyFeatureService, options);

  await app.bootstrap();
  await app.listen();
  console.log('Application is running!');
}

bootstrap();
```

## Enabling Transports with Class Decorators

To make your service accessible via different communication protocols (transports), Dawai uses **class decorators** from `@arifwidianto/dawai-common`. These decorators are applied to your service class and tell the framework which transport adapters to enable and how to configure them.

Common class decorators include:
*   `@webservice()`: Enables HTTP and WebSocket capabilities via `@arifwidianto/dawai-webservice`.
*   `@stdio()`: Enables Command Line Interface (CLI) capabilities via `@arifwidianto/dawai-stdio`.
*   `@mcpServer()`: Configures the class as an MCP (Model Context Protocol) server.
*   `@a2aAgent()`: Configures the class as an A2A (Agent-to-Agent) communication agent.

### Example: Using `@webservice` and `@stdio`

Let's modify `MyFeatureService` to enable HTTP and CLI transports:

```typescript
// src/services/MyFeatureService.service.ts
import { webservice, stdio } from '@arifwidianto/dawai-common';

@webservice({
  enabled: true, // Explicitly enable the webservice transport
  port: 3000,    // Configure the port for the HTTP server
  options: {
    basePath: '/api/feature' // Optional base path for all HTTP routes in this service
  }
})
@stdio({
  enabled: true, // Explicitly enable the stdio transport
  options: {
    interactive: true,        // Enable interactive mode for the CLI
    prompt: 'feature-cli> '   // Custom prompt for interactive mode
  }
})
export class MyFeatureService {
  private dataStore: string[] = [];

  // Methods will be decorated later to become handlers
  addItem(item: string): string {
    this.dataStore.push(item);
    return `Item "${item}" added. Total items: ${this.dataStore.length}`;
  }

  getItem(index: number): string | undefined {
    return this.dataStore[index];
  }
}
```

**How it Works:**
*   When the `Microservice` instance bootstraps, it inspects the `MyFeatureService` class for these class decorators.
*   If `@webservice()` is present and `enabled: true`, and `@arifwidianto/dawai-webservice` is installed, the `WebserviceTransportAdapter` will be automatically registered and initialized with the provided options (port 3000, base path `/api/feature`).
*   Similarly, `@stdio()` will auto-register and configure the `StdioTransportAdapter`.
*   The options provided in the class decorators can be overridden or supplemented by the `MicroserviceOptions` passed to the `Microservice` constructor.

## Multiple Services

A Dawai application can be composed of multiple service classes. You can pass an array of service classes to the `Microservice` constructor.

```typescript
// src/index.ts
import { Microservice } from '@arifwidianto/dawai-microservice';
import { UserService } from './services/UserService.service';
import { ProductService } from './services/ProductService.service';

const app = new Microservice([UserService, ProductService], { /* ... */ });
// ...
```
Each service class can have its own set of class decorators to define which transports it participates in.

## Service Lifecycle and Dependency Injection (Basic)

Dawai instantiates your service classes when the `Microservice` class is created. If your service has a constructor with dependencies, you'll need a more advanced setup, potentially involving a dependency injection container (though Dawai itself does not mandate a specific DI framework, it's designed to be compatible).

For simple services without complex constructor dependencies, the instantiation is straightforward.

## Next Steps

Once you have defined your service class and enabled transports using class decorators, the next step is to define **handlers** within your service to process incoming requests or commands.

*   Learn about [Creating Handlers (Endpoints/Commands)](./handlers.md).
*   Explore [Configuration Options](./configuration.md) in more detail.
