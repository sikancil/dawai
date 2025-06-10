# Dawai Framework Technical Reference for LLM

**Objective**: Provide LLMs with a concise, technical reference for Dawai framework components, decorators, configurations, and types.

## 1. Core Packages

*   **`@arifwidianto/dawai-common`**: Shared: interfaces, ALL decorators, types, Zod.
*   **`@arifwidianto/dawai-microservice`**: Core: `Microservice` class, `AbstractTransportAdapter`.
*   **`@arifwidianto/dawai-webservice`**: Transport: HTTP/S, WebSockets, SSE (uses Express.js).
*   **`@arifwidianto/dawai-stdio`**: Transport: CLI (STDIO).
*   **`@arifwidianto/dawai-cli`**: Tool: Project scaffolding, code generation.

## 2. Decorators (`@arifwidianto/dawai-common`)

### 2.1. Class Decorators

*   **`@webservice(options?: WebserviceDecoratorOptions)`**
    *   **Purpose**: Enables WebService transport for a service.
    *   **Options (`WebserviceDecoratorOptions` extends `WebserviceOptions`):**
        *   `enabled?: boolean`
        *   `port?: number`
        *   `host?: string`
        *   `options?: { basePath?: string, cors?: CorsOptions | boolean, security?: HelmetOptions | boolean | { rateLimit?: RateLimitOptions }, bodyParser?: object, logging?: boolean | object, middleware?: Function[], websocket?: object, crud?: { basePath?: string }, sse?: { basePath?: string }, rpc?: { basePath?: string }, https?: { key: string, cert: string } }`
    *   **Example**: `@webservice({ options: { basePath: '/items' } })`

*   **`@stdio(options?: StdioDecoratorOptions)`**
    *   **Purpose**: Enables STDIO (CLI) transport for a service.
    *   **Options (`StdioDecoratorOptions` extends `StdioOptions`):**
        *   `enabled?: boolean`
        *   `options?: { interactive?: boolean, prompt?: string }`
    *   **Example**: `@stdio({ options: { interactive: true } })`

### 2.2. Method Decorators

*   **`@Crud(options: CrudHandlerOptions)`**
    *   **Purpose**: Defines a RESTful HTTP endpoint.
    *   **Options (`CrudHandlerOptions`):**
        *   `method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'` (Required)
        *   `path: string` (Required, e.g., `/`, `/:id`)
        *   `schema?: ZodSchema` (Optional, for request body/query/params validation)
        *   `middleware?: Function[]` (Optional, Express middleware)
    *   **Example**: `@Crud({ method: 'POST', path: '/', schema: CreateItemSchema })`

*   **`@Cli(options: CliHandlerOptions)`**
    *   **Purpose**: Defines a CLI command.
    *   **Options (`CliHandlerOptions`):**
        *   `command: string` (Required, e.g., `add <item> --priority <level>`)
        *   `description?: string`
        *   `aliases?: string[]`
        *   `schema?: ZodSchema` (Optional, for argument/option validation)
    *   **Example**: `@Cli({ command: 'process <file>', schema: ProcessFileSchema })`

*   **`@Ws(options: WsHandlerOptions)`**
    *   **Purpose**: Handles WebSocket connections or events.
    *   **Options (`WsHandlerOptions`):**
        *   `path?: string` (For connection handler, e.g., `/updates`)
        *   `event?: string` (For specific event handler, e.g., `newMessage`)
        *   `schema?: ZodSchema` (Optional, for event payload validation if `event` is set)
    *   **Example (Connection)**: `@Ws({ path: '/live' })`
    *   **Example (Event)**: `@Ws({ event: 'message', path: '/live', schema: MessageSchema })`

*   **`@Sse(options: SseHandlerOptions)`**
    *   **Purpose**: Defines a Server-Sent Events stream.
    *   **Options (`SseHandlerOptions`):**
        *   `path: string` (Required)
    *   **Handler Return**: Must be `Observable` or object with `subscribe` method.
    *   **Example**: `@Sse({ path: '/events' })`

*   **`@Rpc(options: RpcHandlerOptions)`**
    *   **Purpose**: Defines an RPC-style HTTP endpoint (typically POST).
    *   **Options (`RpcHandlerOptions`):**
        *   `path: string` (Required)
        *   `schema?: ZodSchema` (Optional, for request body validation)
    *   **Example**: `@Rpc({ path: '/invokeAction', schema: ActionSchema })`

*   **`@Llm(options: LlmToolOptions)`**
    *   **Purpose**: Exposes a method as an LLM tool/function.
    *   **Options (`LlmToolOptions`):**
        *   `name: string` (Required, for LLM)
        *   `description: string` (Required, for LLM)
        *   `schema?: ZodSchema` (Required, defines tool input parameters)
    *   **Example**: `@Llm({ name: 'get_weather', description: 'Fetches weather for a city.', schema: WeatherSchema })`

### 2.3. Parameter Decorators

(Used within handler methods)

*   **`@Body(key?: string, schema?: ZodSchema)`**: Injects request body (HTTP) or parsed CLI args/options. `key` for specific property.
*   **`@Query(key?: string, schema?: ZodSchema)`**: Injects HTTP URL query parameters. `key` for specific param.
*   **`@Params(key?: string, schema?: ZodSchema)`**: Injects HTTP URL path parameters. `key` for specific param.
*   **`@Headers(key?: string, schema?: ZodSchema)`**: Injects HTTP request headers. `key` for specific header.
*   **`@Cookies(key?: string, schema?: ZodSchema)`**: Injects HTTP cookies. Requires `cookie-parser` middleware.
*   **`@Session(key?: string)`**: Injects HTTP session object or property. Requires session middleware.
*   **`@Files(key?: string)`**: Injects uploaded files (HTTP). Requires file upload middleware.
*   **`@Ctx()`**: Injects transport-specific context: `WebserviceContext` or `StdioContext`.
*   **`@Req()`**: (WebService) Injects Express `Request` object.
*   **`@Res()`**: (WebService) Injects Express `Response` object.

## 3. `MicroserviceOptions` Interface (Key Properties)

Passed to `new Microservice(services, options)`.

*   **`webservice?: WebserviceOptions`**
    *   `enabled: boolean` (Required if section present)
    *   `port?: number` (Default: 3000 or `process.env.PORT`)
    *   `host?: string` (Default: '0.0.0.0' or `process.env.HOST`)
    *   `options?: { basePath?: string, cors?: CorsOptions | boolean, security?: HelmetOptions | boolean | { rateLimit?: RateLimitOptions }, bodyParser?: object, logging?: boolean | object, middleware?: Function[], websocket?: { path?: string, options?: object }, https?: { key: string, cert: string } }`

*   **`stdio?: StdioOptions`**
    *   `enabled: boolean` (Required if section present)
    *   `options?: { interactive?: boolean, prompt?: string }`

*   **(Conceptual) `mcpClient?: McpClientOptions`, `mcpServer?: McpServerOptions`, `a2aAgent?: A2aAgentOptions`**

## 4. Key Context Objects

*   **`WebserviceContext`** (Injected by `@Ctx()` in `@webservice` handlers)
    *   `req: Express.Request`
    *   `res: Express.Response`
    *   `wsClient?: WebSocket` (Available in `@Ws` connection handler and event handlers if applicable)
    *   `wsServer?: WebSocket.Server` (The `express-ws` server instance)

*   **`StdioContext`** (Injected by `@Ctx()` in `@stdio` handlers)
    *   `stdin: NodeJS.ReadStream`
    *   `stdout: NodeJS.WriteStream`
    *   `stderr: NodeJS.WriteStream`
    *   `argv: string[]` (Raw command-line arguments)
    *   `parsedArgs: Record<string, any>` (Arguments parsed according to command string, often what `@Body()` injects)
    *   `isInteractive: boolean`
    *   `exit(code?: number): void` (Exits the CLI application)

## 5. Zod Validation

*   **Association**: `schema: ZodSchema` option in method decorators (`@Crud`, `@Cli`, `@Llm`, etc.).
*   **Execution**: Transport adapter validates *before* handler invocation.
*   **Failure**:
    *   WebService: HTTP 400 with error details.
    *   STDIO: Error message to `stderr`, may exit.
*   **Type Inference**: Use `z.infer<typeof MySchema>` for handler parameter types.
    *   **Example**: `async createUser(@Body() data: z.infer<typeof CreateUserSchema>) { ... }`

## 6. Error Handling

*   **`HttpException(statusCode: number, message: string, details?: any)`**:
    *   Defined in `@arifwidianto/dawai-common`.
    *   Throw from `@webservice` handlers for specific HTTP error responses.
*   **Standard `Error`**: Can be thrown from any handler.
    *   WebService: Default to HTTP 500 or handled by custom error middleware.
    *   STDIO: Logged to `stderr`.
*   **Best Practice**: Define custom error classes extending `HttpException` or `Error` for domain-specific errors.

This reference is dense by design for LLM processing. Refer to `dawai-coding-patterns.md` for usage examples and best practices.
