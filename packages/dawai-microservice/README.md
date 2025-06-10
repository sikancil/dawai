# `@arifwidianto/dawai-microservice` - Dawai Microservice Core

The `@arifwidianto/dawai-microservice` package is the heart of the `dawai` framework, providing the essential tools and abstractions for building microservice applications.

## Description

This package enables developers to create modular and scalable services by defining a clear structure for service classes, handler methods, and transport mechanisms. It orchestrates the lifecycle of a service and integrates various transport adapters to expose service functionalities through different protocols (e.g., HTTP, STDIO, WebSockets).

Key functionalities include:
*   **Microservice Class:** A central class (`Microservice`) to instantiate and manage your service.
*   **Transport Abstraction:** Defines an abstract `TransportAdapter` class that specific transport implementations (like HTTP or STDIO) can extend.
*   **Handler Registration:** Discovers and registers handlers (methods within your service class) based on decorators from `@arifwidianto/dawai-common`.
*   **Lifecycle Management:** Provides `bootstrap`, `listen`, and `close` methods to manage the service's operational state.

## Installation

This package is a core dependency for any application built with the `dawai` framework.

```bash
npm install @arifwidianto/dawai-microservice
# or
yarn add @arifwidianto/dawai-microservice
# or
pnpm add @arifwidianto/dawai-microservice
```
It depends on `@arifwidianto/dawai-common` and has a peer dependency on `zod`.

## Core Components

### `Microservice` Class

The `Microservice` class is the main entry point for a `dawai` application.
*   **Constructor:** Takes your main service class (which contains methods decorated as handlers) and optional `MicroserviceOptions` (defined in `@arifwidianto/dawai-common`).
*   **`registerTransport(adapterInstance: TransportAdapter)`:** Allows you to plug in different transport adapters (e.g., `StdioTransportAdapter`, `WebserviceTransportAdapter`). The `Microservice` class can also auto-register transports based on class decorators like `@webservice` or `@stdio` found on the service class, if the corresponding adapters are available.
*   **`bootstrap(): Promise<void>`:** Initializes all registered transport adapters and the service instance. This step typically involves discovering handlers and setting up routes or command listeners.
*   **`listen(): Promise<void[]>`:** Starts all registered transport adapters, making the service ready to accept requests or commands.
*   **`close(): Promise<void[]>`:** Gracefully shuts down all transport adapters and the service.
*   **`getServiceInstance(): any`:** Returns the instantiated service class.

### `TransportAdapter` Abstract Class

This abstract class defines the contract for all transport adapters. Concrete adapters must implement:
*   **`initialize(): Promise<void>`:** Logic to set up the transport (e.g., configure an HTTP server, initialize yargs for CLI).
*   **`listen(): Promise<void>`:** Logic to start the transport and begin accepting incoming requests/commands.
*   **`close(): Promise<void>`:** Logic to shut down the transport.
*   **`executeHandler(...)` (protected):** The core method responsible for invoking the actual service method associated with a request/command, including parameter injection and handling the response.
It also provides a `registerHandler` method used by the `Microservice` class to inform the adapter about available handlers and their metadata.

### Interfaces

*   **`HandlerMetadata`:** Defines the structure of metadata associated with each handler method. This includes information derived from decorators like `@Cli`, `@Crud`, `@Ws`, etc., such as the transport type, path, HTTP method, Zod schema for validation, and the actual method name.
*   **`TransportAdapterConstructor`:** An interface describing the constructor signature for transport adapter classes.

## Usage

A typical `dawai` application involves creating a service class with decorated methods and then using the `Microservice` class to run it.

**1. Define your Service Class:**
```typescript
// src/my.service.ts
import { Cli, Crud, Body, Ctx, webservice } from '@arifwidianto/dawai-common';
import { StdioContext } from '@arifwidianto/dawai-stdio'; // Assuming you might use STDIO
// For web services, you'd typically use Express types or similar for context if needed.
import { z } from 'zod';

const userSchema = z.object({ name: z.string(), email: z.string() });

@webservice({ path: '/api' }) // Example class decorator for auto-registration
export class MyAwesomeService {
  @Cli({ command: 'greet', description: 'Greets a user via CLI' })
  async greetUser(@Body() args: { name?: string }, @Ctx() ctx: StdioContext) {
    const name = args.name || 'World';
    ctx.stdout.write(`Hello, ${name} from CLI!\n`);
    return { message: `Greeted ${name}` };
  }

  @Crud({ method: 'POST', path: '/users', schema: userSchema })
  async createUser(@Body() userData: z.infer<typeof userSchema>) {
    console.log('Creating user:', userData);
    // ... database logic
    return { id: Date.now().toString(), ...userData };
  }

  @Crud({ method: 'GET', path: '/users/:id' })
  async getUser(@Ctx() ctx: any /* Express.Request or similar */) {
    const userId = ctx.req.params.id; // Example for Express-like context
    console.log('Fetching user:', userId);
    return { id: userId, name: 'John Doe', email: 'john@example.com' };
  }
}
```

**2. Bootstrap and Run the Microservice:**
```typescript
// src/index.ts
import 'reflect-metadata'; // Important: Must be imported at the top
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MyAwesomeService } from './my.service';
import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio'; // Example adapter
import { WebserviceTransportAdapter } from '@arifwidianto/dawai-webservice'; // Example adapter
import { MicroserviceOptions } from '@arifwidianto/dawai-common';

async function main() {
  const microserviceOptions: MicroserviceOptions = {
    webservice: { // Options for WebserviceTransportAdapter
      enabled: true,
      port: 3000,
      options: {
        // express app settings, cors, rate limiting etc.
      }
    },
    stdio: { // Options for StdioTransportAdapter
      enabled: true, // e.g. if MyAwesomeService also had @stdio class decorator
      options: {
        prompt: 'awesome-cli> '
      }
    }
    // ... other transport options
  };

  const app = new Microservice(MyAwesomeService, microserviceOptions);

  // Adapters can be auto-registered if class decorators like @webservice are used
  // and the corresponding adapter packages are installed.
  // Or, register them manually:
  // app.registerTransport(new WebserviceTransportAdapter(microserviceOptions, app.getServiceInstance()));
  // app.registerTransport(new StdioTransportAdapter(microserviceOptions, app.getServiceInstance()));


  await app.bootstrap();
  await app.listen();

  console.log('Microservice is running!');
}

main().catch(console.error);
```

This `README.md` provides an overview of the `@arifwidianto/dawai-microservice` package.
