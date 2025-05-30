# RPC Microservice Example

This example demonstrates a simple microservice using the `@arifwidianto/dawai-microservice` package with an RPC (Remote Procedure Call) transport over WebSockets.

## Features Demonstrated

- RPC-based microservice with WebSocket transport
- Method registration and execution
- Error handling for non-existent methods
- Proper WebSocket connection lifecycle
- Client ID tracking and context passing
- Graceful shutdown with signal handling
- TypeScript support with ES modules

## Setup

1. Ensure you are in the root of the `dawai` workspace
2. Install dependencies for all packages and examples:
   ```bash
   npm install
   ```
   This installs all dependencies including `tsx`, `typescript`, and `ws` for the example.

## Running the Example

You need to run the server first, and then the client in a separate terminal.

### Option 1: From the Example Directory

#### 1. Start the RPC Server

```bash
cd examples/rpc-example
npm run start:server
```

#### 2. Run the RPC Client (in a new terminal)

```bash
cd examples/rpc-example
npm run start:client
```

### Option 2: From the Root Directory (Convenience Scripts)

#### 1. Start the RPC Server

```bash
npm run example:01:start:server
```

#### 2. Run the RPC Client (in a new terminal)

```bash
npm run example:01:start:client
```

Both approaches will compile and run the TypeScript files using `tsx`. The server will listen on `ws://localhost:8080` by default.

## Expected Output

### Server Terminal:

```
Microservice 'RpcDemoService' initialized with transport 'rpc'.
[RpcDemoService] Event: onBeforeStart
Microservice 'RpcDemoService' starting...
RPCTransportAdapter for 'RpcDemoService' starting on port 8080...
RPCTransportAdapter for 'RpcDemoService' listening on ws://localhost:8080
[RpcDemoService] Event: onAfterStart - RPC Server should be listening on port 8080.
Microservice 'RpcDemoService' has started.
[RpcDemoService] Service started. RPC server is active on port 8080.
RPC client connected to 'RpcDemoService'.
RPC client disconnected from 'RpcDemoService'.
```

The server will continue running until you stop it with `Ctrl+C`, which triggers a graceful shutdown:

```
Microservice 'RpcDemoService' received SIGINT. Shutting down...
[RpcDemoService] Event: onBeforeStop
Microservice 'RpcDemoService' stopping...
RPCTransportAdapter for 'RpcDemoService' stopping...
RPCTransportAdapter for 'RpcDemoService' stopped.
[RpcDemoService] Event: onAfterStop
Microservice 'RpcDemoService' has stopped.
```

### Client Terminal:

```
[RPC Client] Attempting to connect to RPC server at ws://localhost:8080
[RPC Client] Connected to server.

[RPC Client] Calling "greet" with "RPC User"...
[RPC Client] Response from greet: Hello, RPC User! This is RpcDemoService (RPC Service). Client ID (from context): ::1:57972

[RPC Client] Calling "add" with [123, 877]...
[RPC Client] Response from add: 123 + 877 = 1000

[RPC Client] Calling non-existent method "subtract"...
[RPC Client] Error from subtract (as expected): Method 'subtract' not found

[RPC Client] All calls finished. Closing connection.
[RPC Client] Disconnected from server. Code: 1000, Reason: Client finished all operations
```

The client will automatically complete all calls and disconnect cleanly.

## Key Features & Implementation Details

### Configuration
- **Default Port**: Server listens on port 8080
- **Port Configuration**: Change port in `src/server.ts` by modifying `rpcOptions: { port: <new_port> }` and update the URL in `src/client.ts`
- **Transport**: Uses WebSocket protocol for RPC communication

### RPC Methods Demonstrated
- **`greet(name: string)`**: Returns personalized greeting with client ID
- **`add(a: number, b: number)`**: Performs addition and returns result
- **Error Handling**: Attempts to call non-existent `subtract` method to demonstrate error responses

### Technical Highlights
- **TypeScript & ES Modules**: Full TypeScript support with modern ES module syntax
- **Decorator-Based Methods**: Uses `@llmTool` decorators for method registration and metadata
- **Automatic Method Discovery**: `discoverAndRegisterMethods()` automatically registers decorated class methods
- **Context Access**: Methods receive `PluginContext` with RPC-specific details like `ctx.rpcContext.clientId`
- **Middleware Support**: Demonstrates custom middleware for request logging and processing
- **Lifecycle Events**: Comprehensive event system with `onBeforeStart`, `onAfterStart`, `onBeforeStop`, `onAfterStop`, and `onError`
- **Signal Handling**: Graceful shutdown on SIGINT (Ctrl+C)
- **Proper WebSocket Closure**: Client disconnects with code 1000 and descriptive reason
- **Connection Management**: Clean connect → execute → disconnect lifecycle

### Development Tools
- **Runtime**: Uses `tsx` for TypeScript execution (replaces `ts-node`)
- **Linting**: ESLint configured for TypeScript with type-aware rules
- **Code Quality**: Strict TypeScript configuration with proper error handling

## Troubleshooting

- **Connection Refused**: Ensure the server is running before starting the client
- **Port Conflicts**: If port 8080 is in use, change the port in both server and client files
- **TypeScript Errors**: Run `npm run lint` to check for linting issues
