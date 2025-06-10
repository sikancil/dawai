# Dawai Framework Coding Patterns & Best Practices for LLM

**Objective**: Provide LLMs with direct coding patterns, `dawai-cli` usage, and best practices for generating Dawai framework code.

## 1. `dawai-cli` Usage

*   **`npx @arifwidianto/dawai-cli generate app --name <AppName>`**
    *   **Creates**: Project skeleton: `src/index.ts`, `src/services/`, `package.json`, `tsconfig.json`.
    *   **`src/index.ts` requires**: `import 'reflect-metadata';` as first line.

*   **`npx @arifwidianto/dawai-cli generate service --name <ServiceName>`**
    *   **Creates**: `src/services/<ServiceName>.service.ts` with basic class.
    *   **Run from**: Project root.

*   **`npx @arifwidianto/dawai-cli generate handler --serviceName <SvcName> --handlerName <HdlrName> [options]`**
    *   **Modifies**: `<SvcName>.service.ts` by adding the handler method.
    *   **Options (Examples)**:
        *   `--transports webservice --method GET --path /items` (for `@Crud`)
        *   `--transports stdio --command "list items"` (for `@Cli`)
        *   `--schema ItemSchemaName` (Adds `schema` option to decorator)
    *   **Run from**: Project root.

## 2. Application Entry Point (`src/index.ts`) Pattern

```typescript
// REQUIRED: Must be the very first import in your application's entry point.
import 'reflect-metadata';

import { Microservice } from '@arifwidianto/dawai-microservice';
import { MicroserviceOptions } from '@arifwidianto/dawai-common';

// Import ALL your service classes
import { MyWebService } from './services/MyWebService.service';
import { MyCliService } from './services/MyCliService.service';

async function bootstrap() {
  const options: MicroserviceOptions = {
    webservice: {
      enabled: true,
      port: 3000,
      options: { basePath: '/api' /* other webservice options */ }
    },
    stdio: {
      enabled: true,
      options: { interactive: false /* other stdio options */ }
    }
    // other_transport_options: { enabled: true, ... }
  };

  const app = new Microservice(
    [MyWebService, MyCliService /*, OtherServiceClasses */], // Array of service classes
    options
  );

  try {
    await app.bootstrap();
    await app.listen();
    // Optional: console.log for running servers
  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
}

bootstrap();
```
*   **DO**: Import `reflect-metadata` first.
*   **DO**: Instantiate `Microservice` with an array of ALL service classes.
*   **DO**: Call `app.bootstrap()` then `app.listen()`.
*   **DO**: Configure transports in `MicroserviceOptions`.

## 3. Service Class Definition Pattern

```typescript
import { webservice, Crud, Body, Params, Ctx, StdioContext, Cli, Llm } from '@arifwidianto/dawai-common';
import { z } from 'zod'; // ALWAYS use Zod for schema validation
// import { HttpException } from '@arifwidianto/dawai-common'; // For specific HTTP errors
// import { WebserviceContext } from '@arifwidianto/dawai-common'; // For Ctx() type hints

// Define Zod schemas for inputs
export const CreateItemPayloadSchema = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
});
export const ItemIdParamSchema = z.object({ id: z.string().uuid() });

@webservice({ options: { basePath: '/items' } }) // Enable WebService for this service
@stdio() // Enable STDIO for this service
export class ItemService {
  private itemsStore: Map<string, any> = new Map(); // Example in-memory store

  // WebService Handler (CRUD POST)
  @Crud({ method: 'POST', path: '/', schema: CreateItemPayloadSchema })
  async createItem(
    @Body() payload: z.infer<typeof CreateItemPayloadSchema>
    // @Ctx() ctx: WebserviceContext // Optional: for direct req/res access
  ): Promise<{ id: string } & z.infer<typeof CreateItemPayloadSchema>> {
    const id = crypto.randomUUID(); // Node.js 19+ or use 'uuid' package
    const newItem = { id, ...payload };
    this.itemsStore.set(id, newItem);
    // DO: Return data that can be serialized (objects, primitives).
    // DO NOT: Return complex class instances unless they are simple DTOs.
    return newItem;
  }

  // WebService Handler (CRUD GET by ID)
  @Crud({ method: 'GET', path: '/:id' /* schema for params can be added if complex */ })
  async getItemById(
    @Params('id') id: string // Simple param, Zod schema on method if needed for object
    // @Params() params: z.infer<typeof ItemIdParamSchema> // If using schema for params object
  ): Promise<any> {
    const item = this.itemsStore.get(id);
    if (!item) {
      // DO: Throw HttpException for specific HTTP errors
      // throw new HttpException(404, `Item with ID ${id} not found`);
      throw new Error(`Item with ID ${id} not found`); // Will be 500 by default
    }
    return item;
  }

  // CLI Handler
  @Cli({ command: 'items:add <name> <value>', description: 'Adds an item.', schema: CreateItemPayloadSchema })
  async addItemCli(
    @Body() args: z.infer<typeof CreateItemPayloadSchema>, // @Body() for CLI maps parsed args to schema
    @Ctx() ctx: StdioContext
  ): Promise<void> { // CLI handlers typically return void and use ctx.stdout
    const id = crypto.randomUUID();
    const newItem = { id, name: args.name, value: args.value };
    this.itemsStore.set(id, newItem);
    ctx.stdout.write(`Item added with ID: ${id}\nName: ${args.name}, Value: ${args.value}\n`);
    // DO NOT: Return values from CLI handlers unless specifically designed for chaining (rare).
  }

  // LLM Tool Handler
  @Llm({
    name: 'get_item_information',
    description: 'Retrieves information about an item given its ID.',
    schema: ItemIdParamSchema
  })
  async getItemForLlm(
    @Body() params: z.infer<typeof ItemIdParamSchema> // LLM provides arguments matching this schema
  ): Promise<any> { // Return value is serialized and sent back to the LLM
    const item = this.itemsStore.get(params.id);
    if (!item) {
      // DO: Throw errors if tool execution fails.
      throw new Error(`LLM Tool: Item with ID ${params.id} not found.`);
    }
    // DO: Return data in a format easily consumable by the LLM (JSON-like objects).
    return { id: item.id, name: item.name, value: item.value, retrievedAt: new Date().toISOString() };
  }
}
```

## 4. Best Practices for LLM Generation

*   **Imports First**: Always generate necessary imports from `@arifwidianto/dawai-common`, `zod`, etc., at the top of the file.
*   **Zod Schemas**:
    *   **DO**: Define Zod schemas for ALL inputs to handlers (`@Crud`, `@Cli`, `@Llm`, etc.).
    *   **DO**: Place schema definitions near the service or import them.
    *   **DO**: Use `z.infer<typeof YourSchema>` for typing handler parameters that receive validated data.
    *   **DO**: Pass the schema instance to the `schema` option of method decorators.
*   **Async/Await**:
    *   **DO**: Use `async` for handler methods that perform any I/O or asynchronous operations. Use `await` for calling such operations.
    *   **DO**: Ensure `Promise<ReturnType>` is the return type for `async` handlers.
*   **Return Values**:
    *   `@Crud`, `@Rpc`, `@Llm`: Return serializable data (objects, arrays, primitives). Dawai handles JSON serialization.
    *   `@Cli`: Typically `Promise<void>`. Use `ctx.stdout.write()` for output.
    *   `@Sse`: Return an `Observable` or an object with a `subscribe` method.
*   **Error Handling**:
    *   **DO**: Throw `HttpException(statusCode, message)` from `@webservice` handlers for controlled HTTP error responses.
    *   **DO**: Throw standard `Error` or custom errors for other cases. The framework will handle them appropriately per transport.
    *   **DO NOT**: Catch all errors within handlers just to log them, unless re-throwing or handling specifically. Let errors propagate to Dawai's error handlers.
*   **Context Object (`@Ctx()`)**:
    *   **DO**: Use `@Ctx()` to access transport-specific features (e.g., `res.setHeader()` in web, `ctx.stdout.write()` in CLI).
    *   **DO**: Type the context parameter correctly: `ctx: WebserviceContext` or `ctx: StdioContext`.
*   **Parameter Decorators**:
    *   **DO**: Use the most specific decorator (e.g., `@Params('id')` over `@Body()` if only one param is needed from path).
    *   **DO**: If a Zod schema is defined on the method decorator (e.g., `@Crud({ schema: ... })`), the parameter injected by `@Body()` will already be validated and typed according to that schema.
*   **Idempotency**: For `@Llm` tools that perform mutations, consider idempotency if the LLM might retry.
*   **Clarity for LLM**: When generating code for an LLM tool (`@Llm`), ensure the `name` and `description` options are very clear and accurately reflect the tool's capability and parameters. The `schema` defines the exact input contract.

## 5. Disallowed / Anti-Patterns

*   **DO NOT**: Forget `import 'reflect-metadata';` as the first line in `src/index.ts`. Application will fail.
*   **DO NOT**: Manually parse `req.body` or `process.argv` in handlers if using `@Body()` with a schema; Dawai does this.
*   **DO NOT**: End HTTP responses manually (e.g., `res.send()`) if returning a value from a `@Crud` or `@Rpc` handler, unless you have a specific reason and understand the implications. Dawai auto-responds with the return value.
*   **DO NOT**: Include business logic directly in `src/index.ts`. Keep it in service classes.
*   **DO NOT**: Create overly large service classes. Decompose into smaller, focused services if logic becomes too complex.
