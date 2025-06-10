# Getting Started with Dawai

This guide will walk you through setting up your development environment and creating your first "Hello World" application using the Dawai framework.

## Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js**: Dawai is built on Node.js. We recommend using a recent LTS version (e.g., 18.x or later). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm, yarn, or pnpm**: A Node.js package manager. npm is included with Node.js.

## 1. Setting Up Your Project

You can start a new Dawai project using the `dawai-cli` tool. The CLI helps scaffold a basic application structure.

### Using `dawai-cli` to Generate an App

The easiest way to create a new Dawai application is with the `generate app` command:

```bash
npx @arifwidianto/dawai-cli generate app --name my-first-dawai-app --path ./my-first-dawai-app
```

This command will:
1.  Create a new directory named `my-first-dawai-app`.
2.  Scaffold a minimal Dawai application structure within that directory, including:
    *   A `package.json` file with necessary dependencies (`@arifwidianto/dawai-microservice`, `@arifwidianto/dawai-common`, etc.).
    *   A `tsconfig.json` file for TypeScript configuration.
    *   A `src/` directory containing:
        *   `index.ts`: The main entry point for your application.
        *   `services/`: A directory to hold your service classes.
        *   An example service (e.g., `AppService.service.ts`).

Navigate into your new project directory:
```bash
cd my-first-dawai-app
```

### Install Dependencies

Once the project is generated, install the dependencies:
```bash
npm install
# or
# yarn install
# or
# pnpm install
```

## 2. Creating a Simple "Hello World" Service

Let's create a very simple service that exposes a "hello" command via the CLI and an HTTP endpoint.

### Define the Service Class

Open or create `src/services/HelloService.service.ts` and add the following code:

```typescript
import { Cli, Crud, Body, Ctx, webservice, stdio } from '@arifwidianto/dawai-common';
import { StdioContext } from '@arifwidianto/dawai-stdio';
import { WebserviceContext } from '@arifwidianto/dawai-webservice'; // Assuming you might use this for HTTP context
import { z } from 'zod';
import chalk from 'chalk';

// Optional: Define a schema for input validation
const HelloSchema = z.object({
  name: z.string().optional().describe('The name to greet.'),
});
type HelloOptions = z.infer<typeof HelloSchema>;

// Apply class decorators to enable transports
@stdio({ enabled: true, options: { interactive: true, prompt: 'hello-app> ' } })
@webservice({ enabled: true, port: 3000, options: { basePath: '/api' } })
export class HelloService {

  @Cli({
    command: 'hello',
    description: 'Prints a greeting message to the console.',
    schema: HelloSchema,
  })
  async sayHelloCli(
    @Body() options: HelloOptions,
    @Ctx() ctx: StdioContext
  ) {
    const name = options.name || 'World';
    ctx.stdout.write(chalk.blue(`Hello, ${name}! (from CLI)\n`));
    return { success: true, message: `Greeted ${name} via CLI` };
  }

  @Crud({
    method: 'GET',
    path: '/hello', // Will be prefixed by basePath from @webservice, e.g., /api/hello
    schema: HelloSchema, // Zod schema for query parameters
  })
  async sayHelloHttp(
    @Query() // For GET, options come from query params
    options: HelloOptions,
    @Ctx() ctx: WebserviceContext // Access to req, res if needed
  ) {
    const name = options.name || 'World';
    const greeting = `Hello, ${name}! (from HTTP)`;
    console.log(`Responding to HTTP request: ${greeting}`);
    // The framework handles sending the response.
    // You can customize by using @Res() and Express response methods.
    return { message: greeting };
  }
}
```
**Explanation:**
*   We import necessary decorators and types from `@arifwidianto/dawai-common`, `@arifwidianto/dawai-stdio`, and `@arifwidianto/dawai-webservice`.
*   `@stdio(...)` and `@webservice(...)` class decorators enable the STDIO (CLI) and HTTP transports for this service.
*   `HelloService` contains two methods:
    *   `sayHelloCli`: Decorated with `@Cli` to make it a command-line command (`hello-app> hello --name Alice`). It uses `@Body` to get parsed arguments and `@Ctx` for `StdioContext`.
    *   `sayHelloHttp`: Decorated with `@Crud` to make it an HTTP GET endpoint (`GET /api/hello?name=Alice`). It uses `@Query` to get query parameters.

### Update the Main Application Entry Point

Now, modify `src/index.ts` to use your `HelloService`:

```typescript
import 'reflect-metadata'; // Must be the first import
import { Microservice } from '@arifwidianto/dawai-microservice';
import { MicroserviceOptions } from '@arifwidianto/dawai-common';
import { HelloService } from './services/HelloService.service';

// Import transport adapters if not relying solely on auto-registration via class decorators
// For this example, class decorators @stdio and @webservice on HelloService
// should trigger auto-registration if the respective packages are installed.
// import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio';
// import { WebserviceTransportAdapter } from '@arifwidianto/dawai-webservice';

async function bootstrap() {
  console.log('Starting Dawai Hello World application...');

  // MicroserviceOptions can be loaded from config files or environment variables
  const microserviceOptions: MicroserviceOptions = {
    // Options here will be merged with those from class decorators.
    // Options defined directly in MicroserviceOptions often take precedence
    // or provide global defaults.
    stdio: {
      // enabled: true, // Can be set here or by @stdio on the service
      options: {
        // prompt: 'app-global> ' // This could override the prompt from @stdio
      }
    },
    webservice: {
      // enabled: true, // Can be set here or by @webservice on the service
      // port: 3001, // This could override the port from @webservice
      options: {
        // basePath: '/global-api' // This could override the basePath from @webservice
      }
    }
  };

  // Create a new Microservice instance with your service class
  const app = new Microservice(HelloService, microserviceOptions);

  // Manual registration (alternative to or in combination with class decorators)
  // If you don't use @stdio or @webservice class decorators, you'd register adapters manually:
  // app.registerTransport(new StdioTransportAdapter(microserviceOptions, app.getServiceInstance()));
  // app.registerTransport(new WebserviceTransportAdapter(microserviceOptions, app.getServiceInstance()));

  try {
    // Bootstrap the application (initializes adapters, discovers handlers)
    await app.bootstrap();

    // Start listening for incoming requests/commands
    await app.listen();

    console.log('Application is running. Try the CLI or HTTP endpoint.');
    console.log('CLI: Run `npm start` then type `hello --name YourName` or just `hello`');
    console.log(`HTTP: Open http://localhost:3000/api/hello?name=YourName or http://localhost:3000/api/hello`);

  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1);
  }
}

bootstrap();
```
**Explanation:**
*   `reflect-metadata` is crucial and must be imported first.
*   We create an instance of `Microservice`, passing our `HelloService` and `MicroserviceOptions`.
*   The `bootstrap()` method initializes the service and its transport adapters.
*   The `listen()` method starts the adapters, making the application ready to handle requests.
*   Class decorators `@stdio` and `@webservice` on `HelloService` enable auto-registration of the respective transport adapters if `@arifwidianto/dawai-stdio` and `@arifwidianto/dawai-webservice` are installed.

## 3. Running Your Application

### Add Scripts to `package.json`

Ensure your `package.json` has scripts to build and run your application:
```json
{
  // ... other package.json content
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsc -p tsconfig.json --watch & nodemon dist/index.js"
  }
}
```
You might need to install `nodemon` as a dev dependency: `npm install -D nodemon`.

### Build and Start

1.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```
2.  **Start the application:**
    ```bash
    npm start
    ```

You should see output indicating the application is running.

## 4. Interacting with Your Application

### Via CLI (STDIO)

Since we configured `@stdio({ interactive: true })`, the application will start with an interactive prompt (e.g., `hello-app>`).
*   Type `hello` and press Enter. Output: `Hello, World! (from CLI)`
*   Type `hello --name Alice` and press Enter. Output: `Hello, Alice! (from CLI)`
*   Type `help` to see available commands.
*   Type `exit` or press `Ctrl+C` to close the interactive prompt.

If you run it with arguments directly (one-shot mode):
```bash
node dist/index.js hello --name Bob
```
Output: `Hello, Bob! (from CLI)` (The application will then exit).

### Via HTTP (WebService)

Open your web browser or use a tool like `curl`:
*   Navigate to `http://localhost:3000/api/hello`
    *   Response: `{"message":"Hello, World! (from HTTP)"}`
*   Navigate to `http://localhost:3000/api/hello?name=Alice`
    *   Response: `{"message":"Hello, Alice! (from HTTP)"}`

Using `curl`:
```bash
curl "http://localhost:3000/api/hello?name=Alice"
# Expected output: {"message":"Hello, Alice! (from HTTP)"}
```

## Next Steps

Congratulations! You've created and run your first Dawai application.

From here, you can explore more advanced topics:
*   **[Defining Services](./guides/services.md)**
*   **[Creating Handlers](./guides/handlers.md)**
*   **[Parameter Injection](./guides/parameter-injection.md)**
*   **[Using `dawai-cli`](./guides/cli-tool.md)** for more complex scaffolding.

Refer to the other guides and API references in this documentation for more details.
