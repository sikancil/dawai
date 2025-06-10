# Using `dawai-cli` - The Dawai Command Line Tool

The `@arifwidianto/dawai-cli` package provides the `dawai` command-line interface (CLI), a powerful utility designed to streamline your development workflow with the Dawai framework. It helps you scaffold new projects, services, handlers, and other components, ensuring consistency and adherence to best practices.

## Purpose of `dawai-cli`

*   **Accelerate Development**: Quickly generate boilerplate code for common Dawai components.
*   **Ensure Consistency**: Scaffolding follows the framework's architectural patterns.
*   **Reduce Errors**: Minimize manual setup and potential mistakes.
*   **Enhanced Developer Experience**: Offers interactive modes and aims for AI-powered scaffolding in future iterations.

## Installation

You can use `dawai-cli` via `npx` for one-off commands or install it globally for frequent use.

**Using with `npx` (Recommended for most cases):**
```bash
npx @arifwidianto/dawai-cli <command> [options]
```

**Global Installation:**
```bash
npm install -g @arifwidianto/dawai-cli
# Then you can use it directly:
dawai <command> [options]
```

## Key Commands

The primary command you'll interact with is `generate`.

### `dawai generate`

This is the base command for all scaffolding tasks. It requires a subcommand to specify what you want to generate.

#### 1. `dawai generate app`

Generates a new minimal Dawai microservice application structure.

**Usage:**
```bash
dawai generate app --name <AppName> --path <DirectoryPath> [options]
```

**Key Options:**
*   `--name <AppName>` (Required): The name for your new application (e.g., `MyAwesomeApi`).
*   `--path <DirectoryPath>` (Required): The directory where the new application will be created (e.g., `./my-awesome-api`).
*   `--template <TemplateName>` (Optional): Specify a pre-defined template to use for the application structure. (Future feature, currently defaults to a standard minimal app).

**Example:**
```bash
npx @arifwidianto/dawai-cli generate app --name MyWebApp --path ./my-web-app
```
This will create a `my-web-app` directory with a basic Dawai project setup, including `package.json`, `tsconfig.json`, and a `src` directory with an entry point and an example service.

#### 2. `dawai generate service`

Generates a new boilerplate service class file within an existing Dawai project.

**Usage:**
```bash
dawai generate service --name <ServiceName> [options]
```

**Key Options:**
*   `--name <ServiceName>` (Required): The name of the service to generate (PascalCase, e.g., `UserProfileService`). The CLI will typically create a file like `UserProfileService.service.ts`.
*   `--path <DirectoryPath>` (Optional): The directory where the service file should be created. By default, it's often `src/services/`. You can specify a relative path (e.g., `src/modules/user/services`) or an absolute path.

**Example:**
```bash
# Assuming you are in the root of your Dawai project
npx @arifwidianto/dawai-cli generate service --name OrderProcessingService
```
This will create `src/services/OrderProcessingService.service.ts` (or similar) with a basic class structure.

#### 3. `dawai generate handler`

Generates a new handler method boilerplate within an existing service class file. This is one of the most frequently used commands.

**Usage:**
```bash
dawai generate handler --serviceName <ServiceName> --handlerName <HandlerName> [options]
```

**Key Options:**
*   `--serviceName <ServiceName>` (Required): The name of the existing service class where the handler should be added (e.g., `OrderProcessingService`).
*   `--handlerName <HandlerName>` (Required): The name for the new handler method (e.g., `createOrder`, `getUserById`).
*   `--transports <cli|crud|webservice|ws|sse|llm|...>` (Required): Specifies the transport type(s) for this handler. Can be a single value or a comma-separated list (e.g., `crud`, `cli,crud`). This determines which method decorator (e.g., `@Crud`, `@Cli`) will be used.
*   `--path <RoutePath>` (Optional, for web transports like `crud`, `sse`, `ws`): The route path for the endpoint (e.g., `/orders`, `/users/:id`).
*   `--method <HttpMethod>` (Optional, for `@Crud`): The HTTP method (e.g., `GET`, `POST`).
*   `--cliCommand <CommandString>` (Optional, for `@Cli`): The CLI command string (e.g., `create-order`).
*   `--wsEvent <EventName>` (Optional, for `@Ws`): The WebSocket event name.
*   `--llmTool <ToolName>` (Optional, for `@Llm`): The LLM tool name.
*   `--includeSchema` (Optional flag): If present, generates a placeholder Zod schema for the handler's input.
*   `--schemaProps <props>` (Optional): A comma-separated list of properties for the generated Zod schema (e.g., `name:string,email:string,age:number`).

**Example:**
```bash
# Generate a POST CRUD handler in ProductService
npx @arifwidianto/dawai-cli generate handler \
  --serviceName ProductService \
  --handlerName createProduct \
  --transports crud \
  --method POST \
  --path /products \
  --includeSchema \
  --schemaProps "name:string,price:number,description:string?"
```
This command would find `ProductService.service.ts`, add a `createProduct` method decorated with `@Crud`, include a Zod schema for validation, and set up parameter injection (e.g., `@Body()`).

#### 4. `dawai generate monorepo`

Generates a new monorepo structure, potentially with multiple pre-configured Dawai microservice packages and shared libraries.

**Usage:**
```bash
dawai generate monorepo --name <MonorepoName> --path <DirectoryPath> [options]
```

**Key Options:**
*   `--name <MonorepoName>` (Required): The name for your new monorepo.
*   `--path <DirectoryPath>` (Required): The directory where the new monorepo will be created.
*   `--template <TemplateName>` (Optional): Specify a monorepo template (e.g., `lerna-basic`, `nx-full`). (Future feature, currently defaults to a standard setup).

**Example:**
```bash
npx @arifwidianto/dawai-cli generate monorepo --name MyAiPlatform --path ./my-ai-platform
```

### Other Commands

*   **`dawai hello`**: A simple command to verify that `dawai-cli` is installed and working correctly. It prints a greeting message.
*   **`dawai --help` or `dawai <command> --help`**: Displays help information for the CLI or a specific command, listing available options and subcommands.

## Interactive Mode

If you run `dawai-cli` without any specific command (or if the underlying `StdioTransportAdapter` is configured for it), it can enter an interactive mode, prompting you for commands:
```bash
npx @arifwidianto/dawai-cli
dawai-cli> generate handler --serviceName MyService ...
```

## Input Validation

`dawai-cli` uses Zod schemas (defined within the CLI package and leveraging `@arifwidianto/dawai-common`) to validate the options you provide to its commands. If you provide invalid options, it will display clear error messages.

## Future: AI-Powered Scaffolding

As outlined in the framework's design goals, `dawai-cli` aims to incorporate AI-powered scaffolding. This would allow developers to use natural language to describe the handler or component they want to generate.

**Hypothetical Example (Future):**
```bash
dawai generate handler "create a new user via POST request to /users that accepts a name and email" --ai
```
The CLI would then attempt to generate the appropriate `@Crud` decorator, method signature, and Zod schema based on this natural language input.

## Best Practices

*   Run `dawai-cli` commands from the root of your Dawai project directory for `generate service` and `generate handler` to ensure paths are resolved correctly.
*   Use the `--help` flag frequently to discover options for each command.
*   Start with simpler `generate` commands and gradually add more options as you become familiar with them.

The `dawai-cli` is a continuously evolving tool. Refer to its specific `README.md` or `--help` output for the most up-to-date command list and options.
