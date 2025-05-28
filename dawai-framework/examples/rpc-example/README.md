# RPC Microservice Example

This example demonstrates a simple microservice using the `@arifwidianto/dawai-microservice` package with an RPC (Remote Procedure Call) transport over WebSockets.

## Setup

1.  Ensure you are in the root of the `dawai-framework` workspace.
2.  Install dependencies for all packages and examples:
    ```bash
    npm install
    ```
    This command needs to be run from the workspace root (`/app/dawai-framework`) to correctly link the `@arifwidianto/dawai-microservice` package and install `ts-node`, `typescript`, and `ws` for the example.

## Running the Example

You need to run the server first, and then the client in a separate terminal.

### 1. Start the RPC Server

Navigate to the example directory and use the server start script:

```bash
cd examples/rpc-example
npm run start:server
```

This will compile and run `src/server.ts` using `ts-node`. The server will listen on `ws://localhost:8080` by default.

### 2. Run the RPC Client

Open a new terminal, navigate to the example directory, and use the client start script:

```bash
cd examples/rpc-example
npm run start:client
```

This will compile and run `src/client.ts` using `ts-node`. The client will attempt to connect to the server, send a few RPC calls, and print the responses.

## Expected Output

**Server Terminal:**
You should see logs indicating the server starting, middleware processing requests, and method executions.

**Client Terminal:**
You should see logs for:
*   Connection to the server.
*   Calling the `greet` method and its response.
*   Calling the `add` method and its response.
*   Attempting to call a non-existent `subtract` method and receiving an error response.
*   Finally, disconnecting from the server.

## Notes
* The server listens on port 8080 by default. This can be changed in `src/server.ts` by passing `rpcOptions: { port: <new_port> }` to the `Microservice` constructor, and updating the URL in `src/client.ts`.
* The client demonstrates basic RPC call functionality, including how to handle responses and errors for each call.
* The `MyRpcToolSet` in `server.ts` demonstrates how methods can access `PluginContext`, including RPC-specific details like `ctx.rpcContext.clientId`.
