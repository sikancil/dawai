# Dawai Framework Advanced Concepts & Patterns for LLM

**Objective**: Provide LLMs with information on advanced Dawai framework concepts, specific use-case patterns, and extensibility points for generating more sophisticated code.

## 1. Advanced WebSocket (`@Ws`) Handling

*   **Connection Lifecycle Management**:
    *   A `@Ws({ path: '/mypath' })` handler without an `event` option manages the entire lifecycle of a WebSocket connection on that path.
    *   **`@Ctx() ctx: WebserviceContext`**: `ctx.wsClient` is the connected `WebSocket` client.
    *   **Usage**: Send initial messages, set up client-specific listeners, handle `close` and `error` events on `ctx.wsClient`.
    ```typescript
    @Ws({ path: '/realtime-feed' })
    async handleFeedConnection(@Ctx() ctx: WebserviceContext) {
      if (!ctx.wsClient) return; // Should always be present
      ctx.wsClient.send(JSON.stringify({ type: 'connection_ack', clientId: crypto.randomUUID() }));
      
      const intervalId = setInterval(() => {
        if (ctx.wsClient?.readyState === WebSocket.OPEN) {
          ctx.wsClient.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 10000);

      ctx.wsClient.on('close', () => {
        clearInterval(intervalId);
        console.log('Client disconnected from /realtime-feed');
      });
      ctx.wsClient.on('error', (err) => {
        clearInterval(intervalId);
        console.error('WebSocket error on /realtime-feed:', err);
      });
    }
    ```

*   **Broadcasting Messages**:
    *   `ctx.wsServer` (the `express-ws` `WebSocketServer` instance) can be used to iterate over all connected clients.
    *   **DO**: Filter clients based on path or other criteria before broadcasting.
    ```typescript
    // Inside a service method, perhaps triggered by another event or handler
    async broadcastUpdate(updateData: any, targetPath: string, @Ctx() ctx: WebserviceContext) {
      if (!ctx.wsServer) return;
      ctx.wsServer.clients.forEach(client => {
        // Check if client is on the correct path (req.url is available on client._socket for express-ws)
        // This check is illustrative; actual path matching might need more robust logic
        // if (client.OPEN && (client as any)._socket.parser.url === targetPath) {
        if (client.readyState === WebSocket.OPEN) { // General check
          client.send(JSON.stringify({ type: 'broadcast', payload: updateData }));
        }
      });
    }
    ```

*   **Event-Specific Handlers (`@Ws({ event: 'eventName', ... })`)**:
    *   These are for structured JSON messages like `{"event": "eventName", "payload": {...}}`.
    *   The `payload` is automatically parsed and validated if a `schema` is provided.
    *   `@Body()` injects the `payload`.
    *   `ctx.wsClient` refers to the specific client that sent the message.
    ```typescript
    @Ws({ event: 'submit_data', path: '/interactive', schema: z.object({ value: z.string() }) })
    async handleSubmitData(
      @Body() data: { value: string },
      @Ctx() ctx: WebserviceContext
    ) {
      if (!ctx.wsClient) return;
      // Process data.value
      ctx.wsClient.send(JSON.stringify({ type: 'data_ack', received: data.value }));
    }
    ```

## 2. Server-Sent Events (`@Sse`) Stream Management

*   **Handler Return**: Must be an `Observable` (e.g., from RxJS) or an object with a `subscribe` method that accepts an observer-like object (`{ next(data), error(err), complete() }`).
*   **Data Format**: Each emission from `next(data)` is sent as an SSE event.
    *   If `data` is a string, it's sent as `data: <string>\n\n`.
    *   If `data` is an object `{ event?: string, id?: string, data: any, retry?: number }`, it's formatted accordingly.
    *   `JSON.stringify` is typically applied to `data.data` if it's an object.
*   **Stream Closure**: When the Observable completes or errors, or the client disconnects, the stream is closed.
```typescript
import { Observable } from 'rxjs'; // Example with RxJS

@Sse({ path: '/clock' })
getClockStream(): Observable<{ event: string, data: string, id: string }> {
  return new Observable(observer => {
    const intervalId = setInterval(() => {
      observer.next({
        event: 'timeUpdate',
        data: new Date().toISOString(),
        id: crypto.randomUUID()
      });
    }, 1000);

    // Cleanup on unsubscribe (client disconnects or observable completes/errors)
    return () => {
      clearInterval(intervalId);
      console.log('Clock SSE stream closed.');
    };
  });
}
```

## 3. Middleware Usage (`@webservice` transport)

*   **Global Middleware**:
    *   Defined in `MicroserviceOptions.webservice.options.middleware: Function[]`.
    *   Applied to ALL routes handled by `WebServiceTransportAdapter`.
    *   Example: `app.use(myGlobalLogger)` in Express.
*   **Route-Specific Middleware**:
    *   Defined in `@Crud({ ..., middleware: Function[] })` or `@Rpc({ ..., middleware: Function[] })`.
    *   Applied ONLY to that specific route, before the handler.
    *   Middleware functions follow Express middleware signature: `(req, res, next) => void`.
```typescript
// Example custom middleware: src/middleware/authMiddleware.ts
// export function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) { return next(); }
//   res.status(401).send('Unauthorized');
// }

// In MicroserviceOptions:
// options: { middleware: [/* cookieParser(), session(...) */] }

// In Service:
// @Crud({ method: 'GET', path: '/protected', middleware: [ensureAuthenticated] })
// async getProtectedResource() { /* ... */ }
```
*   **DO**: Use middleware for concerns like authentication, authorization, advanced logging, request transformation.
*   **DO NOT**: Overuse middleware for core business logic; keep that in service handlers.

## 4. Advanced Zod Schemas

*   **Transformations (`.transform()`)**: Modify data after validation.
    ```typescript
    const StringToDateSchema = z.string().datetime().transform((str) => new Date(str));
    // @Body() createdAfter: z.infer<typeof StringToDateSchema> // Will be a Date object
    ```
*   **Refinements (`.refine()`)**: Custom validation logic beyond basic types.
    ```typescript
    const PasswordSchema = z.string().min(8)
      .refine(val => /[A-Z]/.test(val), "Must contain uppercase")
      .refine(val => /[0-9]/.test(val), "Must contain number");
    ```
*   **Preprocess (`z.preprocess()`)**: Modify data *before* validation.
    ```typescript
    const StringToNumberSchema = z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().positive()
    );
    ```
*   **Discriminated Unions (`z.discriminatedUnion`)**: For validating objects that can take one of several shapes based on a discriminator field.
    ```typescript
    const EventSchema = z.discriminatedUnion("type", [
      z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
      z.object({ type: z.literal("input"), value: z.string() }),
    ]);
    ```
*   **DO**: Use these for complex validation and data shaping directly within schemas.

## 5. Advanced Error Handling Strategies

*   **Custom Error Classes**:
    *   Extend `HttpException` for web-specific errors to control status code and response.
    *   Extend `Error` for general application errors.
    ```typescript
    // export class MyDomainError extends Error { constructor(message, public readonly code) { super(message); } }
    // export class MyAuthError extends HttpException { constructor(message = 'Authentication Failed') { super(401, message); } }
    ```
*   **Global Error Middleware (WebService)**:
    *   Define a custom Express error-handling middleware (signature `(err, req, res, next) => void`).
    *   Register it LAST in `MicroserviceOptions.webservice.options.middleware`.
    *   **DO**: Log the error, then send an appropriate response.
    *   **DO NOT**: Forget to call `next(err)` if you don't handle the error completely.
    ```typescript
    // function globalErrorHandler(err, req, res, next) {
    //   console.error("Global Error:", err);
    //   if (err instanceof HttpException) {
    //     res.status(err.statusCode).json({ message: err.message, details: err.details });
    //   } else {
    //     res.status(500).json({ message: 'Internal Server Error' });
    //   }
    // }
    // options: { middleware: [..., globalErrorHandler] }
    ```

## 6. Extensibility Concepts (High-Level for LLM Awareness)

*   **Custom Decorators**:
    *   Possible to create new class, method, or parameter decorators.
    *   Requires understanding `reflect-metadata` and how Dawai's core engine or transport adapters might consume this new metadata.
    *   **Use Case**: Adding custom metadata for AOP-like concerns, specialized validation, or new handler types.
*   **Custom Transport Adapters**:
    *   Implement `AbstractTransportAdapter` from `@arifwidianto/dawai-microservice`.
    *   Handles all logic for a new communication protocol (e.g., gRPC, MQTT).
    *   Involves metadata discovery, handler registration, request/response lifecycle for that protocol.
    *   This is a significant undertaking.
*   **LLM Should Know**: Dawai is designed to be extensible, but creating custom decorators or transport adapters is an advanced task typically not part of standard application development.

This document covers more nuanced and advanced patterns. For foundational knowledge, refer to `dawai-framework-reference.md` and `dawai-coding-patterns.md`.
