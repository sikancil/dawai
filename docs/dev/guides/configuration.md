# Configuration in Dawai

Configuring your Dawai application involves setting options for the core microservice behavior and for each enabled transport adapter (like WebService, STDIO, etc.). Dawai offers a flexible configuration system primarily through the `MicroserviceOptions` object and class decorators.

## `MicroserviceOptions`

The `MicroserviceOptions` interface (defined in `@arifwidianto/dawai-common`) is the main container for all microservice configurations. You pass an object of this type to the `Microservice` constructor.

```typescript
// src/index.ts
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MicroserviceOptions } from '@arifwidianto/dawai-common';
import { MyService } from './services/MyService.service';

async function bootstrap() {
  const globalOptions: MicroserviceOptions = {
    webservice: {
      enabled: true,
      port: 3000, // Global default port for webservice
      options: {
        basePath: '/global-api',
        cors: {
          enabled: true,
          options: { origin: 'https://example.com' }
        },
        // ... other webservice specific options
      }
    },
    stdio: {
      enabled: true,
      options: {
        interactive: false, // Global default for CLI interactivity
        // prompt: 'global-app> '
      }
    },
    // mcpClient: { ... },
    // mcpServer: { ... },
    // a2aAgent: { ... },
  };

  const app = new Microservice(MyService, globalOptions);
  // ...
}
bootstrap();
```

### Structure of `MicroserviceOptions`

`MicroserviceOptions` typically contains top-level keys for each transport or major feature:
*   `webservice?: WebserviceOptions;`
*   `stdio?: StdioOptions;`
*   `mcpClient?: McpClientOptions;`
*   `mcpServer?: McpServerOptions;`
*   `a2aAgent?: A2aAgentOptions;`

Each of these, like `WebserviceOptions` or `StdioOptions`, further breaks down into:
*   `enabled: boolean;`: Determines if this transport/feature is active.
*   An `options` object: Contains specific settings for that transport/feature. For example, `WebserviceOptions` includes `port`, `host`, `cors`, `security`, `websocket`, `crud`, `sse` configurations. `StdioOptions` includes `interactive` and `prompt`.

Refer to the `MicroserviceOptions` type definition in `@arifwidianto/dawai-common/interfaces/microservice-options.interface.ts` (or the comprehensive list in `STATES/DOCS/DevGuides.md`) for all available fields.

## Class Decorator Options

As seen in the [Defining Services](./services.md) guide, you can also configure transports directly on your service classes using class decorators like `@webservice()` and `@stdio()`.

```typescript
// src/services/MyService.service.ts
import { webservice, stdio } from '@arifwidianto/dawai-common';

@webservice({
  enabled: true,
  port: 3001, // Specific port for this service's webservice aspect
  options: {
    basePath: '/service-specific-api'
  }
})
@stdio({
  enabled: true,
  options: {
    prompt: 'my-service-cli> ' // Specific prompt for this service
  }
})
export class MyService {
  // ... handlers
}
```
The options available within these class decorators (e.g., `WebserviceDecoratorOptions`, `StdioDecoratorOptions`) are typically a subset or partial version of the main transport options found in `MicroserviceOptions`.

## Configuration Precedence

Dawai merges configurations from `MicroserviceOptions` and class decorators. The general precedence rules are:

1.  **`MicroserviceOptions` (Global Configuration)**: Settings provided in the `MicroserviceOptions` object passed to the `Microservice` constructor often act as global defaults or can override settings from class decorators, depending on the specific option and how the transport adapter implements merging.
    *   For instance, if `MicroserviceOptions.webservice.port` is set, it might override a `port` set in a `@webservice()` class decorator, or they might both need to be consistent if multiple services try to listen on different ports via the same adapter instance (which is usually not the case for ports).
    *   The `enabled` flag in `MicroserviceOptions` for a transport can globally enable or disable a transport, potentially overriding class decorator settings if the adapter logic prioritizes the global flag.

2.  **Class Decorator Options (Service-Specific Configuration)**: Settings provided in class decorators (e.g., `@webservice({ port: 3001 })`) apply specifically to how that service interacts with or configures the transport.
    *   Options like `basePath` in `@webservice` are inherently service-specific and are typically prefixed to routes defined within that service.
    *   The `prompt` in `@stdio` might be specific if the CLI can distinguish contexts, or a global prompt might take over.

**General Guideline:**
*   Use `MicroserviceOptions` for settings that apply globally to the application or a transport adapter instance (e.g., global CORS policy, default port if no service specifies one, enabling/disabling transports at a high level).
*   Use class decorator options for settings that are specific to how a particular service exposes itself via a transport (e.g., a service-specific API base path, a unique CLI prompt if applicable).

The exact merging logic can depend on the implementation of each `TransportAdapter`. It's good practice to check the documentation for specific adapters if you encounter unexpected behavior.

## Environment Variables

For production and flexible deployments, it's highly recommended to source configuration values from **environment variables**.

```typescript
// src/config.ts
import { MicroserviceOptions } from '@arifwidianto/dawai-common';
import { CorsOptions } from 'cors'; // Example

export function loadConfiguration(): MicroserviceOptions {
  return {
    webservice: {
      enabled: process.env.WEBSERVICE_ENABLED === 'true',
      port: parseInt(process.env.PORT, 10) || 3000,
      options: {
        basePath: process.env.API_BASE_PATH || '/api',
        cors: {
          enabled: process.env.CORS_ENABLED === 'true',
          options: {
            origin: process.env.CORS_ORIGIN || '*', // Be more specific in production
          } as CorsOptions, // Cast if necessary for complex types
        },
        security: {
          rateLimit: {
            enabled: process.env.RATE_LIMIT_ENABLED === 'true',
            options: {
              windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
              max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
            },
          },
        },
        // ... other options from environment variables
      },
    },
    stdio: {
      enabled: process.env.STDIO_ENABLED === 'true',
      options: {
        interactive: process.env.STDIO_INTERACTIVE === 'true',
        prompt: process.env.STDIO_PROMPT || 'app> ',
      },
    },
  };
}

// src/index.ts
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MyService } from './services/MyService.service';
import { loadConfiguration } from './config';

async function bootstrap() {
  const config = loadConfiguration();
  const app = new Microservice(MyService, config);
  // ...
}
bootstrap();
```
You can use libraries like `dotenv` to manage `.env` files for local development.

## Transport-Specific Options

Each transport adapter (`WebServiceTransportAdapter`, `StdioTransportAdapter`, etc.) will have its own set of specific options.

### `WebserviceOptions` Highlights:
*   `port`, `host`: Network interface to bind to.
*   `https`: Configuration for enabling HTTPS.
*   `cors`: CORS (Cross-Origin Resource Sharing) settings.
*   `security`: Includes `rateLimit` options (using `express-rate-limit`), `defaultHeaders`, `trustProxy`.
*   `bodyParser`: Configuration for request body parsing (JSON, URL-encoded, text).
*   `logging`: Options for request logging.
*   `performance`: Settings like `requestTimeout`, `sseKeepAliveIntervalMs`.
*   `websocket`: Path and options for the WebSocket server (using `express-ws`).
*   `crud`, `sse`, `rpc`: Sub-configurations for these specific web protocols, like `basePath`.

### `StdioOptions` Highlights:
*   `interactive`: Boolean to enable/disable interactive readline prompt.
*   `prompt`: String for the interactive mode prompt.

Always refer to the type definitions in `@arifwidianto/dawai-common/interfaces` and the specific documentation for each transport adapter package for a complete list of available configuration options.

## Dynamic Configuration (Advanced)

While the primary configuration is loaded at startup, some advanced scenarios might require dynamic configuration updates. Dawai's core design allows for this, but specific implementations would depend on how transport adapters and services are built to react to such changes (e.g., re-reading configuration, re-initializing components). This is an advanced topic not covered by default.

## Next Steps

*   Understand how [Middleware](./middleware.md) can be configured and used.
*   Review [Deployment](./deployment.md) considerations, which heavily involve configuration.
*   Explore the API reference for [`@arifwidianto/dawai-common`](../api-reference/dawai-common.md) for detailed type definitions of configuration objects.
