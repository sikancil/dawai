# `@arifwidianto/dawai-cli` - Dawai Command Line Interface

The `@arifwidianto/dawai-cli` package provides the `dawai` command-line tool, a powerful utility for scaffolding and managing `dawai` framework projects, services, and other components.

## Description

`dawai-cli` streamlines the development workflow by automating the creation of boilerplate code and project structures. It is built using the `dawai` microservice and stdio components, allowing it to be extensible and robust.

## Installation

The CLI is typically used via `npx` or by installing it globally.

**Using with `npx` (recommended for one-off commands):**
```bash
npx @arifwidianto/dawai-cli <command> [options]
```

**Global Installation (for frequent use):**
```bash
npm install -g @arifwidianto/dawai-cli
dawai <command> [options]
```

## Key Features

*   **Code Generation:** Quickly scaffold new `dawai` applications, monorepos, services, and handlers.
*   **Interactive Mode:** If run without arguments, `dawai-cli` can enter an interactive prompt for command execution.
*   **Input Validation:** Uses Zod schemas (imported from `@arifwidianto/dawai-common` and defined locally) to validate command options, providing clear error messages.
*   **Extensible:** Built on the `dawai` microservice architecture, allowing for new commands and features to be added.

## Available Commands

The `dawai` CLI tool provides the following main commands:

### `dawai generate`

This is the base command for all generation tasks. It requires a subcommand.

*   **`dawai generate handler [options]`**
    *   Description: Generates a new handler boilerplate file within an existing service.
    *   Key Options:
        *   `--serviceName <name>`: The name of the service to add the handler to.
        *   `--handlerName <name>`: The name for the new handler method.
        *   `--transports <cli|crud|webservice|...>`: Specifies the transport types (e.g., CLI, CRUD for webservice). Can be multiple.
        *   `--path <routePath>`: The route path for web-based transports.
        *   `--methodName <name>`: The actual method name in the generated code.
        *   `--includeSchema`: Whether to include a sample Zod schema.
        *   (And other transport-specific options like `--webserviceMethods`, `--crudMethods`)

*   **`dawai generate service [options]`**
    *   Description: Generates a new boilerplate service class file (e.g., `MyExampleService.service.ts`).
    *   Key Options:
        *   `--name <ServiceName>`: The name of the service to generate (PascalCase).
        *   `--path <directory>`: The directory where the service file should be created (relative to `src/services` or an absolute path).

*   **`dawai generate app [options]`**
    *   Description: Generates a new minimal `dawai` microservice application structure.
    *   Key Options:
        *   `--name <AppName>`: The name of the application.
        *   `--path <directory>`: The directory where the new application will be created.
        *   `--template <templateName>`: (Optional) Specify a template to use.

*   **`dawai generate monorepo [options]`**
    *   Description: Generates a new monorepo structure with Lerna/Nx, including example `dawai` microservices and shared packages.
    *   Key Options:
        *   `--name <MonorepoName>`: The name of the monorepo.
        *   `--path <directory>`: The directory where the new monorepo will be created.
        *   `--template <templateName>`: (Optional) Specify a monorepo template.

### `dawai hello`

*   Description: A simple command that prints a "Hello" message. Useful for verifying the CLI is working.

### Help

To get help for any command or subcommand, use the `--help` flag:
```bash
dawai --help
dawai generate --help
dawai generate handler --help
```

## Usage Examples

**Generate a new handler:**
```bash
npx @arifwidianto/dawai-cli generate handler --serviceName MyUserService --handlerName GetUserProfile --transports crud --crudMethods GET --path /users/:id
```

**Generate a new service:**
```bash
npx @arifwidianto/dawai-cli generate service --name MyPaymentService
```

**Generate a new application:**
```bash
npx @arifwidianto/dawai-cli generate app --name MyNewApp --path ./my-new-app-directory
```

## Technical Details

The CLI is implemented as a `DawaiCliService` class, which uses decorators from `@arifwidianto/dawai-common` (like `@Cli`) to define commands and their options. It leverages `@arifwidianto/dawai-stdio` for parsing command-line arguments (via `yargs`), handling interactive mode, and managing input/output. The actual generation logic for each command is encapsulated in `execute...` functions within the `src/services/cli/` directory (e.g., `executeGenerateHandlerCommand`).
