# Middleware in Dawai

Middleware functions are a powerful mechanism in Dawai to process requests and commands before they reach their designated handlers, or to perform actions after a handler has executed. They are ideal for handling cross-cutting concerns such as logging, authentication, authorization, request modification, and more.

Dawai's middleware system is designed to be flexible and can be applied globally to a transport or scoped to specific handlers.

## What is Middleware?

In the context of Dawai (and web frameworks like Express), a middleware is a function or a class method that has access to:
*   The transport-specific context (e.g., request and response objects for HTTP, command arguments for CLI).
*   A `next` function, which, when called, passes control to the next middleware in the chain or to the final handler.

Middleware can:
*   Execute any code.
*   Make changes to the request and response (or context) objects.
*   End the request-response cycle (e.g., by sending a response directly if a condition isn't met, like failed authentication).
*   Call the next middleware in the stack.

## Defining Middleware

In Dawai, middleware is typically defined as a class with a `use` method. This method receives the transport-specific context (`@Ctx()`) and the `next` function (`@Next()`).

```typescript
// src/middleware/LoggingMiddleware.ts
import { Ctx, Next } from '@arifwidianto/dawai-common'; // Assuming @Next is a planned decorator or concept
                                                     // For Express-based middleware, it's often (req, res, next)

// For WebServiceTransportAdapter (Express-based)
import { Request, Response, NextFunction } from 'express';

export class LoggingMiddleware {
  // Example for Express-based middleware used with WebServiceTransportAdapter
  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.originalUrl}`);

    // To allow the request to proceed to the next middleware or handler
    await next(); // Or just next() if not async

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Request finished: ${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
  }
}

// Example: A conceptual Dawai-generic middleware structure
// (Actual implementation might vary based on transport adapter)
export class GenericAuthMiddleware {
  async use(@Ctx() ctx: any, @Next() next: () => Promise<any>) {
    console.log('[AuthMiddleware] Checking authentication...');
    const apiKey = ctx.req?.headers?.['x-api-key']; // Example access

    if (!apiKey || apiKey !== 'secret-key') {
      console.log('[AuthMiddleware] Unauthorized access attempt.');
      // For HTTP, you might throw an error that the framework translates
      // throw new Error('Unauthorized');
      // Or, if ctx provides a way to send a response directly:
      // ctx.res.status(401).send('Unauthorized');
      // For other transports, behavior would differ.
      return; // Stop processing
    }

    console.log('[AuthMiddleware] Authenticated successfully.');
    ctx.user = { id: 'user-from-api-key', roles: ['admin'] }; // Augment context
    await next(); // Proceed to next middleware or handler
  }
}
```
**Note:** The exact signature and capabilities of the `use` method and the `Ctx` object can vary depending on the specific transport adapter. For `@arifwidianto/dawai-webservice`, middleware often conforms to the Express middleware signature `(req, res, next)`.

## Applying Middleware

Middleware can be applied in two main ways:

### 1. Global Middleware

Global middleware is applied to all routes or commands handled by a specific transport adapter. You typically configure this in the `MicroserviceOptions` when setting up the transport.

**Example (for `WebServiceTransportAdapter`):**
In your main application setup (`src/index.ts`):

```typescript
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MicroserviceOptions } from '@arifwidianto/dawai-common';
import { MyService } from './services/MyService.service';
import { LoggingMiddleware } from './middleware/LoggingMiddleware';
// Assuming AuthMiddleware is also defined
// import { AuthMiddleware } from './middleware/AuthMiddleware';

async function bootstrap() {
  const options: MicroserviceOptions = {
    webservice: {
      enabled: true,
      port: 3000,
      options: {
        // For Express-based adapters, middleware is often an array of functions/classes
        middleware: [
          new LoggingMiddleware().use, // If 'use' is the Express middleware function
          // (req, res, next) => new AuthMiddleware().use(req, res, next), // If it needs instantiation
        ],
        // Some adapters might allow direct class registration:
        // middlewareClasses: [LoggingMiddleware, AuthMiddleware],
      }
    },
    // stdio: {
    //   options: {
    //     middleware: [/* CLI-specific middleware */]
    //   }
    // }
  };

  const app = new Microservice(MyService, options);
  await app.bootstrap();
  await app.listen();
}
bootstrap();
```
The way middleware is registered globally (e.g., as instantiated methods, classes, or functions) depends on the specific transport adapter's implementation. For `WebServiceTransportAdapter` (which uses Express), you usually provide Express-compatible middleware functions.

### 2. Handler-Scoped Middleware

You can apply middleware to specific handlers using a decorator, often named `@UseMiddleware()` (or similar, depending on framework conventions). This allows for more granular control.

```typescript
// src/services/SecureDataService.service.ts
import { Crud, UseMiddleware } from '@arifwidianto/dawai-common'; // Assuming @UseMiddleware decorator
import { AuthMiddleware } from '../middleware/AuthMiddleware'; // Your custom auth middleware
import { Ctx } from '@arifwidianto/dawai-common';

export class SecureDataService {

  @Crud({ method: 'GET', path: '/secure-data' })
  @UseMiddleware(AuthMiddleware) // Apply AuthMiddleware only to this handler
  async getSecureData(@Ctx() ctx: any) {
    // Thanks to AuthMiddleware, ctx.user should be populated
    const userId = ctx.user?.id || 'unknown';
    return { message: `This is TOP SECRET data for user ${userId}.` };
  }

  @Crud({ method: 'GET', path: '/public-data' })
  async getPublicData() {
    return { message: 'This data is public and requires no authentication.' };
  }
}
```
**Note:** The availability and exact name of a `@UseMiddleware` decorator would depend on its definition within `@arifwidianto/dawai-common` or a specific transport package. If not directly available, transport adapters might provide alternative mechanisms for route-specific middleware.

## Middleware Execution Order

*   **Global Middleware**: Executed in the order they are defined in the configuration array.
*   **Handler-Scoped Middleware**: Executed before the handler itself, also in the order they are applied if multiple `@UseMiddleware` decorators are used.
*   If both global and handler-scoped middleware are present, global middleware typically runs first, followed by handler-scoped middleware, and finally the handler method.

## Common Use Cases for Middleware

*   **Logging**: Recording details about incoming requests/commands and outgoing responses.
*   **Authentication**: Verifying the identity of the client (e.g., checking API keys, JWT tokens).
*   **Authorization**: Checking if the authenticated client has permission to access a resource or perform an action.
*   **Input Validation/Sanitization**: Performing preliminary validation or sanitization of incoming data before it reaches Zod validation or the handler.
*   **Request/Context Modification**: Adding data to the request or context object (e.g., attaching user information after authentication) for later use by handlers.
*   **CORS**: Handling Cross-Origin Resource Sharing for HTTP services.
*   **Rate Limiting**: Protecting services from abuse.
*   **Compression**: Compressing HTTP response bodies.

## Error Handling in Middleware

If a middleware encounters an error or needs to stop further processing (e.g., authentication failure), it can:
1.  **Throw an error**: The Dawai framework's error handling mechanism (or the underlying framework like Express) will catch this and typically send an appropriate error response.
2.  **Send a response directly**: For HTTP middleware, it can directly use `res.status(...).send(...)` and then *not* call `next()`. This ends the cycle.

```typescript
// Inside AuthMiddleware's use method (Express example)
// async use(req: Request, res: Response, next: NextFunction) {
//   if (!isAuthenticated(req)) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return; // Do not call next()
//   }
//   await next();
// }
```

## Transport-Specific Considerations

*   **WebService (`Express.js`)**: Middleware functions typically have the signature `(req: Request, res: Response, next: NextFunction)`. Many existing Express middleware modules can be used directly.
*   **STDIO (`dawai-stdio`)**: Middleware might operate on the parsed arguments (`argv`) or the `StdioContext` before a command handler is invoked. The concept of "ending the cycle" might mean preventing the command from running and printing an error.

Always refer to the specific documentation of the transport adapter you are using for details on how it supports and integrates middleware.

## Next Steps

*   Learn about [Error Handling](./error-handling.md) to manage exceptions thrown by middleware or handlers.
*   Explore [Configuration Options](./configuration.md) for setting up middleware globally.
