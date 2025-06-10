# `@arifwidianto/dawai-stdio` - STDIO Transport Adapter

The `@arifwidianto/dawai-stdio` package provides a transport adapter for the `dawai` microservice framework, enabling applications to interact via Standard Input/Output (STDIO). This is primarily used for building Command Line Interface (CLI) tools.

## Description

This package bridges the `dawai` microservice core with command-line environments. It handles:
*   Parsing command-line arguments using `yargs`.
*   Mapping CLI commands to service methods decorated with `@Cli` (from `@arifwidianto/dawai-common`).
*   Validating command inputs against Zod schemas.
*   Managing an interactive mode (readline prompt) if the CLI is run without specific commands.
*   Generating help messages for commands and options.
*   Formatting output using `chalk` for better readability.

## Installation

This package is typically a dependency of CLI applications built with `dawai`, such as `@arifwidianto/dawai-cli`.

```bash
npm install @arifwidianto/dawai-stdio
# or
yarn add @arifwidianto/dawai-stdio
# or
pnpm add @arifwidianto/dawai-stdio
```
It also has a peer dependency on `zod` for schema validation.

## Core Components

### `StdioTransportAdapter`

The central piece of this package. It extends the base `TransportAdapter` from `@arifwidianto/dawai-microservice`.
Its responsibilities include:
*   **Initialization (`initialize`):** Sets up `yargs` for command parsing by discovering `@Cli` decorated methods in the registered service. It dynamically builds the command structure, options, and descriptions.
*   **Listening (`listen`):** Determines whether to run in one-shot command mode (if arguments are provided) or interactive mode (if no arguments and TTY is available).
    *   In **one-shot mode**, it parses `process.argv`, executes the matched command, and exits.
    *   In **interactive mode**, it starts a readline interface, prompting the user for commands.
*   **Command Execution (`executeCommandLogic`, `executeHandler`):**
    *   Retrieves the handler metadata for the invoked command.
    *   Validates input arguments against the Zod schema defined in the `@Cli` decorator's options.
    *   Calls the actual service method, injecting parameters like `@Body` (parsed arguments) and `@Ctx` (`StdioContext`).
    *   Handles errors and sets appropriate exit codes.
*   **Help Generation (`displayGlobalHelp`):** Uses `yargs` to display comprehensive help messages.
*   **Input Handling (`handleInput`, `prompt`):** Manages the readline interface for interactive mode.

### `StdioContext` Interface

Defines the shape of the context object (`@Ctx()`) injected into CLI handler methods. It typically provides:
*   `stdin`: The standard input stream.
*   `stdout`: The standard output stream.
*   `stderr`: The standard error stream.
*   `argv`: The parsed command-line arguments.
*   `rawInput`: The raw input string from the interactive prompt.
*   Other relevant information for the STDIO environment.

## Usage

The `StdioTransportAdapter` is registered with a `dawai` `Microservice` instance.

```typescript
import { Microservice } from '@arifwidianto/dawai-microservice';
import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio';
import { MyCliService } from './my-cli-service'; // Your service with @Cli decorators
import { MicroserviceOptions } from '@arifwidianto/dawai-common';

async function startCli() {
  const microserviceOptions: MicroserviceOptions = {
    stdio: {
      enabled: true,
      options: {
        interactive: undefined, // Auto-detect interactive vs one-shot
        prompt: 'my-cli> ',
      },
    },
  };

  const app = new Microservice(MyCliService, microserviceOptions);
  app.registerTransport(new StdioTransportAdapter(microserviceOptions, app.getServiceInstance()));

  await app.bootstrap();
  await app.listen();
}

startCli();
```

### Defining CLI Commands

Commands are defined in your service class using the `@Cli` decorator from `@arifwidianto/dawai-common`.

```typescript
import { Cli, Body, Ctx } from '@arifwidianto/dawai-common';
import { StdioContext } from '@arifwidianto/dawai-stdio';
import { z } from 'zod';
import chalk from 'chalk';

const myCommandSchema = z.object({
  name: z.string().optional().describe('Your name'),
});
type MyCommandOptions = z.infer<typeof myCommandSchema>;

export class MyCliService {
  @Cli({
    command: 'greet',
    description: 'Greets the user.',
    schema: myCommandSchema,
  })
  async greetCmd(@Body() options: MyCommandOptions, @Ctx() ctx: StdioContext) {
    const name = options.name || 'World';
    ctx.stdout.write(chalk.green(`Hello, ${name}!\n`));
    return { success: true, message: `Greeted ${name}` };
  }
}
```

This `README.md` provides an overview of the `@arifwidianto/dawai-stdio` package, its purpose, core components, and basic usage.
