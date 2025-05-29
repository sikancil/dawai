# StdIO Microservice Example

This example demonstrates a microservice using the `@arifwidianto/dawai-microservice` package with an **StdIO (Standard Input/Output) transport**. This example showcases the framework's decorator-based method registration, middleware system, lifecycle events, and interactive command-line interface.

## Features Demonstrated

- **Decorator-Based Method Registration**: Using `@llmTool` decorators with automatic discovery via `discoverAndRegisterMethods()`
- **StdIO Transport**: Interactive command-line interface with real-time input/output
- **Middleware System**: Request/response middleware with access to method metadata
- **Lifecycle Events**: `onBeforeStart`, `onAfterStart`, `onBeforeStop`, `onAfterStop`, `onError`
- **Context Access**: Methods receive `PluginContext` with transport-specific information
- **Manual Method Registration**: Demonstrates both automatic decorator discovery and manual method registration
- **Async Operations**: Support for asynchronous operations with proper handling

## Prerequisites

1. Ensure you are in the root of the `dawai` workspace
2. Install dependencies for all packages and examples:
   ```bash
   npm install
   ```
   This command must be run from the workspace root to correctly link the `@arifwidianto/dawai-microservice` package and install dependencies.

## Running the Example

### Option 1: From Root Directory (Recommended)

```bash
npm run example:02:start
```

### Option 2: From Example Directory

```bash
cd examples/stdio-example
npm start
```

Both commands will compile and run `src/main.ts` using `tsx` (modern TypeScript execution).

## Expected Output

When you start the service, you should see:

```
Microservice 'StdioDemoService' initialized with transport 'stdio'.
[StdioDemoService] Event: onBeforeStart
Microservice 'StdioDemoService' starting...
StdIOTransportAdapter for 'StdioDemoService' starting...
StdioDemoService> StdIOTransportAdapter for 'StdioDemoService' started. Type 'exit' to stop.
[StdioDemoService] Event: onAfterStart
Microservice 'StdioDemoService' has started.
[StdioDemoService] Started. Type commands like "greet YourName", "add 10 5", "testAsync 2000", or "exit".
```

## Available Commands

Once the service starts, you can type commands into the console. The prompt will look like `StdioDemoService>`.

### 1. Greet Command
```
greet JohnDoe
```
**Expected Output:**
```
[Greet Method] PluginContext Name: StdioDemoService
Hello, JohnDoe! This is StdioDemoService running via stdio.
```

**Without Parameter:**
```
greet
```
**Expected Output:**
```
[Greet Method] PluginContext Name: StdioDemoService
Please provide a name.
```

### 2. Add Command
```
add 10 5
```
**Expected Output:**
```
10 + 5 = 15
```

### 3. Async Test Command
```
testAsync 2000
```
**Expected Output:**
```
[StdioDemoService] TestAsync called for StdioDemoService. Waiting for 2000ms...
Async operation complete after 2000ms.
```

### 4. Exit Command
```
exit
```
**Expected Output:**
```
[StdioDemoService] Event: onBeforeStop
Microservice 'StdioDemoService' stopping...
StdIOTransportAdapter for 'StdioDemoService' stopping...
StdIOTransportAdapter for 'StdioDemoService' stopped.
Microservice 'StdioDemoService' has stopped.
[StdioDemoService] Event: onAfterStop
```

## Alternative Exit Methods

You can also terminate the service using:
- `Ctrl+C` - Sends SIGINT for graceful shutdown
- `Ctrl+D` - Sends EOF (on some systems)

## Architecture Overview

This example demonstrates:

1. **Service Initialization**: Creates a microservice with StdIO transport
2. **Method Registration**: 
   - Automatic discovery of `@llmTool` decorated methods from `MyToolSet` class
   - Manual registration of `testAsync` method to show both approaches
3. **Middleware**: Logs requests/responses and demonstrates metadata access
4. **Lifecycle Events**: Handles service start/stop events with proper logging
5. **Interactive Loop**: StdIO transport provides an interactive command-line interface

## Troubleshooting

### TypeScript Execution Issues
If you encounter TypeScript execution errors, ensure you're using the latest dependencies and running from the workspace root.

### Command Not Recognized
If commands aren't recognized, check that:
1. The service started successfully (you see the "Started" message)
2. You're typing commands exactly as shown (case-sensitive)
3. The prompt shows `StdioDemoService>` indicating the service is ready
