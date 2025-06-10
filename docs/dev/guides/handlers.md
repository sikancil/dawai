# Creating Handlers (Endpoints/Commands) in Dawai

Once you have [defined a service class](./services.md) and enabled transports using class decorators, the next step is to define **handlers**. Handlers are methods within your service class that process incoming requests, commands, or events from a specific transport.

Dawai uses **method decorators** from `@arifwidianto/dawai-common` to designate a class method as a handler and to configure its behavior.

## What is a Handler?

A handler is a method in your service class that is responsible for:
1.  Receiving data from an incoming request or event.
2.  Performing business logic.
3.  Optionally, returning a response.

The framework, through its transport adapters, routes incoming communication to the appropriate handler method based on the metadata provided by the method decorators.

## Common Method Decorators

Here are some of the primary method decorators used to define handlers:

*   **`@Crud({ method, path, schema? })`**:
    *   Used for creating HTTP RESTful API endpoints (Create, Read, Update, Delete).
    *   `method`: The HTTP method (e.g., `'GET'`, `'POST'`, `'PUT'`, `'DELETE'`).
    *   `path`: The URL path for the endpoint (e.g., `'/users'`, `'/items/:id'`). This path is relative to any `basePath` defined in the `@webservice` class decorator or global configuration.
    *   `schema?`: An optional Zod schema to validate the request body or query parameters.

*   **`@Cli({ command, description?, schema? })`**:
    *   Used for defining command-line interface (CLI) commands.
    *   `command`: The command string (e.g., `'create-user'`, `'list items'`).
    *   `description?`: A description of the command, used for help messages.
    *   `schema?`: An optional Zod schema to validate command arguments.

*   **`@Ws({ event, path?, schema? })`**:
    *   Used for handling WebSocket events.
    *   `event`: The name of the WebSocket event to listen for (e.g., `'chatMessage'`, `'userTyping'`).
    *   `path?`: The WebSocket connection path (e.g., `'/chat'`). If not provided, it might default or be inherited.
    *   `schema?`: An optional Zod schema to validate incoming WebSocket message payloads.

*   **`@Sse({ path, method? })`**:
    *   Used for establishing Server-Sent Events (SSE) streams.
    *   `path`: The URL path for the SSE endpoint.
    *   `method?`: The HTTP method (usually `'GET'`) for establishing the SSE connection.

*   **`@Rpc({ command, schema? })`**:
    *   Used for defining Remote Procedure Call (RPC) style endpoints.
    *   `command`: The name of the RPC method.
    *   `schema?`: An optional Zod schema for validating RPC parameters.

*   **`@Llm({ tool, schema })`**:
    *   Used for exposing a method as a tool or function callable by a Large Language Model (LLM).
    *   `tool`: The name of the tool as it will be presented to the LLM.
    *   `schema`: A Zod schema defining the arguments the LLM should provide when calling the tool. This is crucial for the LLM to understand the tool's interface.

*   **`@Mcp({ command, schema })`**:
    *   Used for handling commands within the Model Context Protocol (MCP).
    *   `command`: The MCP command name.
    *   `schema`: A Zod schema for the expected command payload.

*   **`@A2a({ command, schema })`**:
    *   Used for handling commands within the Agent-to-Agent (A2A) protocol.
    *   `command`: The A2A command name.
    *   `schema`: A Zod schema for the expected command payload.

All method decorators also accept a `disabled?: boolean` option. If set to `true`, the handler will not be registered.

## Example: Defining Handlers

Let's expand the `MyFeatureService` from the [Defining Services](./services.md) guide to include some handlers.

```typescript
// src/services/MyFeatureService.service.ts
import { webservice, stdio, Crud, Cli, Body, Params, Query, Ctx } from '@arifwidianto/dawai-common';
import { StdioContext } from '@arifwidianto/dawai-stdio';
import { z } from 'zod';
import chalk from 'chalk';

// Define a Zod schema for adding items
const AddItemSchema = z.object({
  item: z.string().min(1, "Item name cannot be empty"),
});
type AddItemPayload = z.infer<typeof AddItemSchema>;

// Define a Zod schema for getting an item (used as query param for HTTP)
const GetItemSchema = z.object({
  index: z.coerce.number().int().min(0, "Index must be a non-negative integer"),
});
type GetItemParams = z.infer<typeof GetItemSchema>;


@webservice({
  enabled: true,
  port: 3000,
  options: { basePath: '/api/feature' }
})
@stdio({
  enabled: true,
  options: { interactive: true, prompt: 'feature-cli> ' }
})
export class MyFeatureService {
  private dataStore: string[] = [];

  // --- HTTP (CRUD) Handler ---
  @Crud({
    method: 'POST',
    path: '/items', // Full path: /api/feature/items
    schema: AddItemSchema // Validates the request body
  })
  async addItemHttp(@Body() payload: AddItemPayload) {
    this.dataStore.push(payload.item);
    console.log(chalk.green(`[HTTP] Item "${payload.item}" added.`));
    return { success: true, message: `Item "${payload.item}" added.`, totalItems: this.dataStore.length };
  }

  // --- CLI Handler ---
  @Cli({
    command: 'add-item',
    description: 'Adds an item to the data store.',
    schema: AddItemSchema // Validates CLI arguments
  })
  async addItemCli(@Body() args: AddItemPayload, @Ctx() ctx: StdioContext) {
    this.dataStore.push(args.item);
    ctx.stdout.write(chalk.blue(`[CLI] Item "${args.item}" added. Total items: ${this.dataStore.length}\n`));
    return { success: true, item: args.item };
  }

  // --- HTTP (CRUD) Handler for GET ---
  @Crud({
    method: 'GET',
    path: '/items/:index', // Full path: /api/feature/items/0, /api/feature/items/1, etc.
    // No schema here, path param 'index' is handled by @Params
  })
  async getItemHttp(@Params('index') indexStr: string) {
    const index = parseInt(indexStr, 10);
    if (isNaN(index) || index < 0 || index >= this.dataStore.length) {
      // Basic validation, could also use a Zod schema with @Params if more complex
      throw new Error('Invalid or out-of-bounds index'); // Framework handles error response
    }
    const item = this.dataStore[index];
    console.log(chalk.green(`[HTTP] Retrieved item at index ${index}: "${item}"`));
    return { item };
  }

  // --- CLI Handler for GET ---
  @Cli({
    command: 'get-item',
    description: 'Retrieves an item from the data store by its index.',
    schema: GetItemSchema // Validates CLI arguments
  })
  async getItemCli(@Body() args: GetItemParams, @Ctx() ctx: StdioContext) {
    const item = this.dataStore[args.index];
    if (item === undefined) {
      ctx.stderr.write(chalk.red(`[CLI] Error: No item found at index ${args.index}\n`));
      // For CLI, you might want to control exit codes or throw for framework handling
      process.exitCode = 1;
      return { success: false, message: `No item at index ${args.index}` };
    }
    ctx.stdout.write(chalk.blue(`[CLI] Item at index ${args.index}: "${item}"\n`));
    return { success: true, item };
  }
}
```

**Explanation:**
*   **`addItemHttp`**:
    *   `@Crud({ method: 'POST', path: '/items', schema: AddItemSchema })` defines this as an HTTP POST endpoint at `/api/feature/items`.
    *   The `AddItemSchema` will be used to validate the JSON body of the POST request.
    *   `@Body()` injects the validated request body.
*   **`addItemCli`**:
    *   `@Cli({ command: 'add-item', schema: AddItemSchema })` defines this as a CLI command.
    *   The `AddItemSchema` will validate arguments passed to the command (e.g., `feature-cli> add-item --item "My New Item"`).
    *   `@Body()` injects the parsed and validated command arguments.
*   **`getItemHttp`**:
    *   `@Crud({ method: 'GET', path: '/items/:index' })` defines this as an HTTP GET endpoint that accepts a path parameter.
    *   `@Params('index')` injects the value of the `:index` path parameter.
*   **`getItemCli`**:
    *   `@Cli({ command: 'get-item', schema: GetItemSchema })` defines this as a CLI command.
    *   `GetItemSchema` validates the `--index` argument.
    *   `@Body()` injects the parsed arguments.

## Handler Return Values

*   For **HTTP handlers** (`@Crud`, `@Sse` initial request), the return value is typically serialized as JSON and sent as the response body. If you return a `Promise`, the framework waits for it to resolve. You can also throw errors, which the framework will convert into appropriate HTTP error responses. For more control, you can inject the raw response object (e.g., using `@Res()` with Express) and handle the response manually.
*   For **CLI handlers** (`@Cli`), the return value can be used for programmatic access if the CLI is called as a module, or it can be logged. Output to `stdout` or `stderr` is usually handled via the injected `StdioContext`.
*   For **WebSocket handlers** (`@Ws`), the return value might be sent back to the originating client or used in other logic. You typically use the injected WebSocket client instance (`ctx.wsClient`) to send messages.
*   For **LLM/MCP/A2A handlers**, the return value is the result of the tool execution or protocol command, formatted according to the respective protocol.

## Asynchronous Handlers

Handlers can be `async` functions. The Dawai framework will `await` the `Promise` returned by an `async` handler before proceeding (e.g., sending an HTTP response).

```typescript
@Crud({ method: 'GET', path: '/slow-data' })
async getSlowData() {
  // Simulate a slow operation
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { data: "This took a while!" };
}
```

## Input Validation with Zod Schemas

Attaching a `ZodSchema` to a handler's decorator options (e.g., `schema: MySchema`) enables automatic input validation.
*   For `@Crud` (POST, PUT, PATCH), it validates `req.body`.
*   For `@Crud` (GET, DELETE), it can validate `req.query` if the parameter decorator (`@Query()`) is used appropriately with the schema.
*   For `@Cli`, it validates the parsed command-line arguments.
*   For `@Ws`, `@Llm`, `@Mcp`, `@A2a`, it validates the incoming message payload or tool arguments.

If validation fails, the framework typically:
*   For HTTP: Sends a 400 Bad Request response with validation error details.
*   For CLI: Prints an error message and exits or prevents command execution.

This significantly reduces boilerplate validation code in your handlers.

## Next Steps

With services and handlers defined, you'll want to inject data into your handlers:
*   Learn about [Parameter Injection](./parameter-injection.md).
*   Explore how to use the [dawai-cli for scaffolding](./cli-tool.md).
*   Dive deeper into [Configuration Options](./configuration.md).
