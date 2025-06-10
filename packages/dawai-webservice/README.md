# `@arifwidianto/dawai-webservice` - Webservice Transport Adapter

The `@arifwidianto/dawai-webservice` package provides a transport adapter for the `dawai` microservice framework, enabling services to expose functionalities over HTTP, Server-Sent Events (SSE), and WebSockets.

## Description

This package integrates `Express.js` to handle web-based communications. It allows developers to define RESTful APIs, real-time SSE streams, and interactive WebSocket endpoints using `dawai` decorators.

Key features include:
*   **HTTP Handling:** Supports standard HTTP methods (GET, POST, PUT, DELETE, etc.) for RESTful API development, typically using the `@Crud` decorator.
*   **WebSocket Support:** Manages WebSocket connections and message routing using `express-ws`, typically for methods decorated with `@Ws`.
*   **Server-Sent Events (SSE):** Enables unidirectional real-time communication from server to client, for methods decorated with `@Sse`.
*   **Middleware Integration:** Leverages Express middleware for common tasks like CORS, cookie parsing, and request logging.
*   **Path and Parameter Handling:** Maps decorated service methods to specific URL paths and extracts parameters from requests.

## Installation

This package is a core dependency for `dawai` applications that need to expose web endpoints.

```bash
npm install @arifwidianto/dawai-webservice
# or
yarn add @arifwidianto/dawai-webservice
# or
pnpm add @arifwidianto/dawai-webservice
```
It depends on `@arifwidianto/dawai-common`, `@arifwidianto/dawai-microservice`, `express`, `cors`, `cookie-parser`, `express-ws`, and `ws`. It also has a peer dependency on `zod`.

## Core Components

### `WebServiceTransportAdapter`

This is the primary class, extending `TransportAdapter` from `@arifwidianto/dawai-microservice`.
*   **Initialization (`initialize`):** Sets up an Express application instance. It configures common middleware (like `cors`, `cookie-parser`, `express.json`, `express.urlencoded`). It also initializes the `express-ws` instance for WebSocket support.
*   **Handler Registration (`registerHandler`):**
    *   For HTTP/CRUD handlers: Dynamically creates Express routes (e.g., `app.get('/path', ...)`) based on `@Crud` decorator metadata (path, HTTP method).
    *   For SSE handlers: Sets up routes that establish SSE connections.
    *   For WebSocket handlers: Uses `DawaiWebSocketHandler` to manage WebSocket routes and connections based on `@Ws` decorator metadata.
*   **Listening (`listen`):** Starts the Express server on the configured port.
*   **Closing (`close`):** Shuts down the HTTP server and closes active WebSocket connections.
*   **Execution (`executeHandler`):** For HTTP requests, it invokes the target service method, injecting parameters (like `@Body`, `@Query`, `@Params`, `@Headers`, `@Cookies`, `@Session`, `@Req`, `@Res`, `@Ctx`) and handling the response. For WebSockets, it delegates to `DawaiWebSocketHandler`.

### `DawaiWebSocketHandler`

A helper class used by `WebServiceTransportAdapter` to manage WebSocket-specific logic:
*   **Constructor:** Takes the Express app, `express-ws` instance, and WebSocket options.
*   **`registerWsHandler`:** Sets up WebSocket routes (e.g., `app.ws('/path', ...)`) for methods decorated with `@Ws`.
*   **Message Handling:** Manages incoming messages on WebSocket connections and dispatches them to the appropriate service method.
*   **Connection Management:** Tracks active WebSocket clients.

### `WebserviceContext` Interface

Defines the shape of the context object (`@Ctx()`) that can be injected into web service handler methods. It typically provides access to the Express `request` and `response` objects, allowing for fine-grained control over the HTTP request-response cycle.

## Usage

The `WebServiceTransportAdapter` is registered with a `dawai` `Microservice` instance.

```typescript
import 'reflect-metadata';
import { Microservice } from '@arifwidianto/dawai-microservice';
import { WebserviceTransportAdapter } from '@arifwidianto/dawai-webservice';
import { MyWebService } from './my-web.service'; // Your service with @Crud, @Ws, @Sse decorators
import { MicroserviceOptions, webservice } from '@arifwidianto/dawai-common';

// Define your service with web-specific decorators
@webservice({ port: 3000 }) // Class decorator can provide default options
export class MyWebService {
  // ... methods decorated with @Crud, @Ws, @Sse
}

async function startServer() {
  const microserviceOptions: MicroserviceOptions = {
    webservice: {
      enabled: true,
      port: process.env.PORT || 3000,
      options: {
        // Express-specific settings like trust proxy, etc.
        // CORS options, rate limiting can also be configured here or applied directly
      },
    },
  };

  const app = new Microservice(MyWebService, microserviceOptions);

  // If @webservice class decorator is used, the adapter might be auto-registered.
  // Otherwise, or for explicit control:
  // app.registerTransport(new WebserviceTransportAdapter(microserviceOptions, app.getServiceInstance()));

  await app.bootstrap();
  await app.listen();

  console.log(`Webservice running on port ${microserviceOptions.webservice?.port}`);
}

startServer();
```

### Defining Web Handlers

Handlers for HTTP, SSE, and WebSockets are defined in your service class using decorators from `@arifwidianto/dawai-common`.

**HTTP/CRUD Example:**
```typescript
import { Crud, Body, Params, Query, Ctx, webservice } from '@arifwidianto/dawai-common';
import { WebserviceContext } from '@arifwidianto/dawai-webservice'; // Or use Express types directly
import { z } from 'zod';

const itemSchema = z.object({ name: z.string() });

@webservice({ path: '/api/items' })
export class ItemService {
  @Crud({ method: 'POST', schema: itemSchema })
  async createItem(@Body() data: z.infer<typeof itemSchema>, @Ctx() ctx: WebserviceContext) {
    // Access ctx.req, ctx.res (Express request/response)
    // ... logic
    return { id: '1', ...data };
  }

  @Crud({ method: 'GET', path: '/:id' })
  async getItem(@Params('id') itemId: string, @Query('details') showDetails?: string) {
    // ... logic
    return { id: itemId, name: 'Sample Item', details: showDetails === 'true' };
  }
}
```

**WebSocket Example:**
```typescript
import { Ws, Body, Ctx, webservice } from '@arifwidianto/dawai-common';
import { WebserviceContext } from '@arifwidianto/dawai-webservice'; // Provides access to ws client

@webservice() // Ensure the class is processed for webservice features
export class ChatService {
  @Ws({ event: 'message', path: '/chat' }) // Path for WebSocket connection
  handleChatMessage(@Body() message: { text: string }, @Ctx() ctx: WebserviceContext) {
    console.log(`Received chat message: ${message.text} from client ${ctx.wsClient?.id}`);
    // Broadcast to other clients or handle logic
    // ctx.wsServer?.clients.forEach(client => client.send(...));
    ctx.wsClient?.send(JSON.stringify({ response: `Server received: ${message.text}` }));
  }

  @Ws({ event: 'connection', path: '/chat' }) // Special event for new connections
  handleConnection(@Ctx() ctx: WebserviceContext) {
    console.log(`Client ${ctx.wsClient?.id} connected to /chat`);
    ctx.wsClient?.send(JSON.stringify({ response: 'Welcome to the chat!' }));
  }
}
```

This `README.md` provides an overview of the `@arifwidianto/dawai-webservice` package.
