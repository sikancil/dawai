# Error Handling in Dawai

Effective error handling is crucial for building robust and user-friendly applications. The Dawai framework provides built-in mechanisms for handling errors that occur during request processing, validation, or within your handlers and middleware. It aims to provide sensible defaults while allowing for customization.

## How Dawai Handles Errors

When an error occurs in a Dawai application, the framework (typically through its transport adapters) catches the error and processes it to generate an appropriate response for the client. The exact response depends on the type of error and the transport protocol being used.

### 1. Zod Validation Errors

Dawai integrates with `Zod` for schema-based input validation. If you attach a Zod schema to a handler decorator (e.g., `@Crud({ schema: MySchema })`), the framework automatically validates the incoming data.
*   **If validation fails**:
    *   **HTTP (`@Crud`, etc.)**: Dawai typically sends a `400 Bad Request` HTTP response. The response body often includes a structured message detailing the validation errors (e.g., which fields failed and why).
    *   **CLI (`@Cli`)**: An error message detailing the validation failures is usually printed to the console, and the command execution is halted. The exit code of the process might be set to indicate failure.
    *   **Other Transports**: Similar appropriate error feedback is provided based on the protocol.

**Example:**
```typescript
// In your service
import { Crud, Body } from '@arifwidianto/dawai-common';
import { z } from 'zod';

const CreateUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
});

// ...
@Crud({ method: 'POST', path: '/users', schema: CreateUserSchema })
async createUser(@Body() userData: z.infer<typeof CreateUserSchema>) {
  // This code only runs if validation passes
  // ... create user logic
  return { message: 'User created', ...userData };
}
```
If a client sends a POST request to `/users` with an invalid email or a username shorter than 3 characters, Dawai will automatically respond with a 400 error without `createUser` being called.

### 2. Standard JavaScript Errors

If your handler or middleware throws a standard JavaScript `Error` (or any error not specifically handled as a custom HTTP error):
*   **HTTP**: Dawai typically translates this into a `500 Internal Server Error` HTTP response. For security reasons, detailed error messages or stack traces might not be sent to the client in a production environment (this can often be configured).
*   **CLI**: The error message and stack trace are usually printed to the console, and the process may terminate with a non-zero exit code.

```typescript
@Crud({ method: 'GET', path: '/some-data' })
async getSomeData() {
  if (Math.random() < 0.1) {
    throw new Error('Something unexpectedly went wrong!');
  }
  return { data: 'Here is your data' };
}
```

### 3. Custom HTTP-Aware Errors (for Web Services)

For web services, you often want to respond with specific HTTP status codes other than 500 for known error conditions (e.g., 404 Not Found, 403 Forbidden). You can achieve this by throwing custom error classes that include a `statusCode` property.

Many transport adapters, especially `WebServiceTransportAdapter` (which uses Express), are designed to recognize such errors.

**Defining a Custom HTTP Error:**
```typescript
// src/errors/HttpException.ts
export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, HttpException.prototype); // For proper instanceof checks
  }
}

// src/errors/NotFoundException.ts
import { HttpException } from './HttpException';

export class NotFoundException extends HttpException {
  constructor(message: string = 'Resource not found', details?: any) {
    super(404, message, details);
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

// src/errors/ForbiddenException.ts
import { HttpException } from './HttpException';

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Access forbidden', details?: any) {
    super(403, message, details);
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}
```

**Using Custom HTTP Errors in Handlers:**
```typescript
// In your service
import { Crud, Params } from '@arifwidianto/dawai-common';
import { NotFoundException } from '../errors/NotFoundException';
import { ForbiddenException } from '../errors/ForbiddenException';

const items = { '1': { name: 'Item One' }, '2': { name: 'Secret Item' } };
const userPermissions = { 'user123': ['viewItemOne'], 'admin456': ['viewItemOne', 'viewSecretItem'] };

@Crud({ method: 'GET', path: '/items/:id' })
async getItem(
  @Params('id') itemId: string,
  // Assume userId is available, perhaps from an auth middleware via @Ctx() or @Req()
  @Req() req: any // Simplified for example
) {
  const userId = req.user?.id || 'guest'; // Example: user from auth middleware
  const item = items[itemId];

  if (!item) {
    throw new NotFoundException(`Item with ID ${itemId} not found.`);
  }

  if (itemId === '2' && !userPermissions[userId]?.includes('viewSecretItem')) {
    throw new ForbiddenException(`You do not have permission to view item ${itemId}.`);
  }

  return item;
}
```
When `NotFoundException` or `ForbiddenException` is thrown, the `WebServiceTransportAdapter` will typically use the `statusCode` and `message` from the exception to craft the HTTP response (e.g., a 404 response with the message "Item with ID 123 not found.").

## Centralized Error Filters/Handlers (Advanced)

For more advanced or customized error handling, especially in web services, Dawai's architecture (particularly when using Express via `WebServiceTransportAdapter`) allows for the integration of centralized error handling middleware or "filters."

These are special middleware functions that are executed when an error occurs in a preceding middleware or handler. They typically have a signature like `(error, req, res, next)` in Express.

**Example (Conceptual for Express-based adapter):**
You might register a custom error handler in your `MicroserviceOptions`:

```typescript
// src/middleware/CustomErrorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../errors/HttpException';

export function customErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction // next is important if you have multiple error handlers
) {
  if (error instanceof HttpException) {
    res.status(error.statusCode).json({
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error); // Log it
    res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
      // In production, avoid sending stack traces or sensitive error details
      // errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

// src/index.ts - in MicroserviceOptions
// webservice: {
//   options: {
//     // ... other middleware
//     // The way to register an error handler depends on the adapter.
//     // For Express, it's usually added last.
//     errorHandlers: [customErrorHandler] // Hypothetical option
//   }
// }
```
The exact mechanism for registering such global error handlers depends on the transport adapter. `WebServiceTransportAdapter` would leverage Express's error handling middleware pattern.

## Logging Errors

It's crucial to log errors, especially unexpected ones, for debugging and monitoring purposes.
*   **Unexpected Errors**: Ensure these are logged with as much detail as possible (stack trace, request context) on the server-side.
*   **Handled Errors (like `HttpException`)**: You might still want to log these, perhaps at a lower severity level (e.g., `warn` or `info`), to track how often they occur.

Logging can be done within a centralized error handler or using a logging middleware.

## Best Practices for Error Handling

*   **Be Specific**: Throw specific error types for known error conditions rather than generic `Error` objects. This allows for more granular error handling.
*   **Don't Leak Sensitive Information**: In production, avoid sending detailed internal error messages or stack traces to the client. Provide generic error messages for 5xx errors.
*   **Consistent Error Format**: For APIs, define a consistent JSON structure for error responses.
*   **Use HTTP Status Codes Correctly**: For web services, adhere to standard HTTP status code semantics.
*   **Validate and Sanitize Input**: Prevent errors by robustly validating all incoming data (Dawai's Zod integration helps greatly here).
*   **Graceful Degradation**: For non-critical errors, consider if your application can degrade gracefully rather than failing completely.
*   **Test Your Error Paths**: Write tests to ensure your error handling logic works as expected for different scenarios.

## Next Steps

*   Review [Middleware](./middleware.md) for implementing custom logging or pre-handler checks.
*   Explore [Testing](./testing.md) strategies, including how to test error conditions.
