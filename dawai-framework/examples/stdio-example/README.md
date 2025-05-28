# StdIO Microservice Example

This example demonstrates a simple microservice using the `@arifwidianto/dawai-microservice` package with an StdIO (Standard Input/Output) transport.

## Setup

1.  Ensure you are in the root of the `dawai-framework` workspace.
2.  Install dependencies for all packages and examples:
    ```bash
    npm install
    ```
    This command needs to be run from the workspace root (`/app/dawai-framework`) to correctly link the `@arifwidianto/dawai-microservice` package and install `ts-node` and `typescript` for the example.

## Running the Example

Navigate to the example directory and use the start script:

```bash
cd examples/stdio-example
npm start
```

This will compile and run `src/main.ts` using `ts-node`.

## Available Commands

Once the service starts, you can type commands into the console. The prompt will look like `StdioDemoService>`.

Available commands:

*   `greet <YourName>`
    *   Example: `greet Alice`
    *   Output: `Hello, Alice! This is StdioDemoService running via stdio.`
*   `add <Number1> <Number2>`
    *   Example: `add 10 25`
    *   Output: `10 + 25 = 35`
*   `testAsync <Milliseconds>`
    *   Example: `testAsync 1500`
    *   Output: (After 1.5 seconds) `Async operation complete after 1500ms.`
*   `exit`
    *   Stops the microservice and exits the application.

You can also use `Ctrl+C` or `Ctrl+D` (on some systems) to terminate the service.
