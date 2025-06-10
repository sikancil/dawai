# Parameter Injection in Dawai Handlers

Dawai provides a powerful and intuitive way to access incoming request data, context, and transport-specific objects within your [handler methods](./handlers.md) using **parameter decorators**. These decorators, primarily from `@arifwidianto/dawai-common`, tell the framework what data to inject into each parameter of your handler function.

## What is Parameter Injection?

Parameter injection is the process by which the framework automatically provides values for the arguments of your handler methods. Instead of manually parsing request bodies, query strings, or headers, you simply decorate the parameters of your handler method, and Dawai takes care of extracting and providing the correct data.

This makes your handler methods cleaner, more readable, and easier to test, as they directly receive the data they need.

## Common Parameter Decorators

Here's a list of the most commonly used parameter decorators:

*   **`@Body(key?: string)`**:
    *   Injects the main payload of the request.
    *   **HTTP (`@Crud`, `@Rpc` etc.)**: Injects the parsed request body (e.g., JSON payload). If `key` is provided, injects a specific property from the body.
    *   **CLI (`@Cli`)**: Injects the parsed command-line arguments (often an object where keys are argument names). If `key` is provided, injects a specific argument.
    *   **WebSocket (`@Ws`)/SSE (`@Sse`)**: Injects the data payload of the event/message.
    *   **LLM (`@Llm`)/MCP (`@Mcp`)/A2A (`@A2a`)**: Injects the arguments or payload for the tool/command.
    *   If a Zod `schema` is defined on the method decorator, `@Body()` typically injects the validated and typed data.

*   **`@Query(key?: string)`**:
    *   Injects URL query parameters. Primarily used with HTTP handlers (`@Crud`, `@Sse`).
    *   If `key` is provided, injects the value of that specific query parameter (e.g., `@Query('userId') id: string`).
    *   If no `key` is provided, injects an object containing all query parameters.
    *   Can be used with a Zod `schema` on the method decorator for validation of all query parameters.

*   **`@Params(paramName?: string)`**:
    *   Injects URL path parameters (e.g., from a route like `/users/:id`). Primarily for HTTP (`@Crud`).
    *   If `paramName` is provided, injects the value of that specific path parameter (e.g., `@Params('id') userId: string`).
    *   If no `paramName` is provided, injects an object containing all path parameters.
    *   **CLI (`@Cli`)**: Can also be used to inject flag-based arguments (e.g., `--verbose`, where the presence of the flag is important rather than a value).

*   **`@Headers(headerName?: string)`**:
    *   Injects request headers. Mainly for HTTP handlers.
    *   If `headerName` is provided (case-insensitive), injects the value of that specific header (e.g., `@Headers('Content-Type') contentType: string`).
    *   If no `headerName` is provided, injects an object containing all request headers.

*   **`@Cookies(cookieName?: string)`**:
    *   Injects parsed request cookies. Mainly for HTTP handlers. Requires `cookie-parser` middleware (or similar) to be set up in the `WebServiceTransportAdapter`.
    *   If `cookieName` is provided, injects the value of that specific cookie.
    *   If no `cookieName` is provided, injects an object containing all cookies.

*   **`@Session()`**:
    *   Injects session data. Mainly for HTTP handlers. Requires session middleware (e.g., `express-session`) to be configured.
    *   Typically injects the entire session object.

*   **`@Files(fieldName?: string)`**:
    *   Injects uploaded files from a `multipart/form-data` request. Mainly for HTTP handlers. Requires file-upload handling middleware (like `multer`, which is often integrated into `WebServiceTransportAdapter`).
    *   If `fieldName` is provided, injects the file(s) associated with that form field.
    *   If no `fieldName` is provided, may inject all files or an array of files, depending on the adapter.
    *   **CLI (`@Cli`)**: Can be used to inject file paths from arguments prefixed with `@` (e.g., `my-command --file=@path/to/file.txt`).

*   **`@Ctx()`**:
    *   Injects the transport-specific execution context object. This provides access to lower-level details of the request and response, or transport-specific functionalities.
    *   For `@arifwidianto/dawai-webservice`, this is often `WebserviceContext` (providing `req`, `res`, `wsClient`, `wsServer`).
    *   For `@arifwidianto/dawai-stdio`, this is `StdioContext` (providing `stdin`, `stdout`, `stderr`, `argv`).

*   **`@Req()`**:
    *   A shortcut to inject the raw request object from the underlying framework (e.g., Express `Request` object in `WebServiceTransportAdapter`).

*   **`@Res()`**:
    *   A shortcut to inject the raw response object from the underlying framework (e.g., Express `Response` object in `WebServiceTransportAdapter`). Using this often means you are taking manual control of sending the response.

## Examples of Parameter Injection

Let's illustrate with examples within a service class:

```typescript
import {
  webservice, stdio, Crud, Cli,
  Body, Query, Params, Headers, Cookies, Files, Ctx, Req, Res
} from '@arifwidianto/dawai-common';
import { StdioContext } from '@arifwidianto/dawai-stdio';
import { WebserviceContext } from '@arifwidianto/dawai-webservice'; // Or import Express types
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { z } from 'zod';

const UserSchema = z.object({
  username: z.string(),
  age: z.number().optional(),
});
type UserPayload = z.infer<typeof UserSchema>;

const SearchSchema = z.object({
  term: z.string(),
  limit: z.coerce.number().optional().default(10),
});
type SearchQuery = z.infer<typeof SearchSchema>;

@webservice({ enabled: true, port: 3000, options: { basePath: '/api' } })
@stdio({ enabled: true })
export class DataService {

  // --- HTTP Examples ---

  @Crud({ method: 'POST', path: '/users', schema: UserSchema })
  async createUser(
    @Body() userData: UserPayload, // Validated user data
    @Headers('x-request-id') requestId?: string
  ) {
    console.log(`Creating user: ${userData.username}, Request ID: ${requestId}`);
    return { id: Date.now().toString(), ...userData };
  }

  @Crud({ method: 'GET', path: '/users/:userId/profile/:section' })
  async getUserProfile(
    @Params('userId') id: string,
    @Params('section') profileSection: string,
    @Query('format') format?: string
  ) {
    console.log(`Fetching section "${profileSection}" of profile for user ${id}. Format: ${format}`);
    return { userId: id, section: profileSection, data: `Profile data for ${profileSection}...`, format };
  }

  @Crud({ method: 'GET', path: '/search', schema: SearchQuery })
  async searchItems(
    @Query() query: SearchQuery // Validated query object
  ) {
    console.log(`Searching for "${query.term}" with limit ${query.limit}`);
    return { results: [`item1 for ${query.term}`, `item2 for ${query.term}`] };
  }

  @Crud({ method: 'GET', path: '/greet' })
  async greetWithCookie(@Cookies('visitorName') name?: string) {
    const visitor = name || 'Guest';
    return `Hello, ${visitor}!`;
  }

  @Crud({ method: 'POST', path: '/upload/:itemId' })
  async uploadItemFile(
    @Params('itemId') itemId: string,
    @Files('itemFile') file: any, // Type depends on multer or similar
    @Body() otherData: { description?: string } // Other form fields
  ) {
    if (!file) throw new Error('No file uploaded');
    console.log(`Uploading file ${file.originalname} for item ${itemId}. Description: ${otherData.description}`);
    return { success: true, filename: file.originalname, itemId };
  }

  @Crud({ method: 'GET', path: '/context-info' })
  async getContextInfo(@Ctx() ctx: WebserviceContext) {
    // ctx.req is Express Request, ctx.res is Express Response
    const userAgent = ctx.req.headers['user-agent'];
    return { userAgent, message: "Accessing context" };
  }

  @Crud({ method: 'GET', path: '/raw-req-res' })
  async handleRaw(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse
  ) {
    // Manual response handling
    res.status(201).json({
      message: 'Manual response from raw Express objects',
      method: req.method,
      path: req.path,
    });
  }

  // --- CLI Examples ---

  @Cli({ command: 'process-data', schema: UserSchema })
  async processDataCli(
    @Body() data: UserPayload, // Validated arguments
    @Ctx() ctx: StdioContext
  ) {
    ctx.stdout.write(`Processing data for CLI user: ${data.username}\n`);
    if (data.age) {
      ctx.stdout.write(`Age provided: ${data.age}\n`);
    }
    return { processed: true, username: data.username };
  }

  @Cli({ command: 'get-config' })
  async getConfigCli(@Body('key') configKey?: string) { // Access specific argument
    if (configKey) {
      return { [configKey]: `value_for_${configKey}` };
    }
    return { allConfig: "..." };
  }
}
```

## Type Safety and Validation

*   When a Zod `schema` is provided in the method decorator (e.g., `@Crud({ ..., schema: UserSchema })`), the data injected by `@Body()` or `@Query()` (if the schema applies to query params) will be automatically validated. If validation fails, the framework typically sends an error response (e.g., 400 Bad Request for HTTP) before your handler code is even executed.
*   The type of the injected parameter should match the inferred type from the Zod schema for full type safety (e.g., `userData: UserPayload` where `UserPayload` is `z.infer<typeof UserSchema>`).
*   For decorators like `@Params`, `@Headers`, `@Cookies`, individual values are usually injected as strings. You may need to perform manual type coercion (e.g., `parseInt()`) if a number is expected, or use Zod schemas within your handler for more complex validation of these individual values if not covered by a top-level schema.

## Order of Parameters

The order of decorated parameters in your handler method signature does not matter. Dawai resolves them based on the decorators, not their position.

## Combining Decorators

You can use multiple parameter decorators in a single handler method signature to inject various pieces of data as needed.

## Next Steps

*   Review specific transport adapter documentation (e.g., for `@arifwidianto/dawai-webservice` or `@arifwidianto/dawai-stdio`) for any nuances in how parameter injection works with that particular transport.
*   Learn about [Middleware](./middleware.md) for pre-processing requests or augmenting context.
*   Understand [Error Handling](./error-handling.md) in Dawai.
