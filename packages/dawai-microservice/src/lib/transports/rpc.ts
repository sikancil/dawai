import { WebSocketServer, WebSocket } from "ws"; // Using 'ws' library
import { Microservice } from "../microservice.js";
import type { PluginContext } from "../microservice.js";
import type { ITransportAdapter } from "./interfaces.js";

interface RPCOptions {
  port?: number;
}

interface RPCRequest {
  type: "call";
  method: string;
  args: unknown[];
  id: string;
}

interface RPCResponse {
  type: "response";
  id: string;
  result?: unknown;
  error?: unknown;
}

export class RPCTransportAdapter implements ITransportAdapter {
  private microservice: Microservice;
  private wss?: WebSocketServer;
  private options: RPCOptions;
  private clients: Set<WebSocket> = new Set();

  constructor(microservice: Microservice, options?: RPCOptions) {
    this.microservice = microservice;
    this.options = { port: 8080, ...options }; // Default port 8080
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.options.port });
        console.log(
          `RPCTransportAdapter for '${this.microservice.name}' starting on port ${this.options.port}...`
        );

        this.wss.on("listening", () => {
          console.log(
            `RPCTransportAdapter for '${this.microservice.name}' listening on ws://localhost:${this.options.port}`
          );
          resolve();
        });

        this.wss.on("connection", (ws) => {
          console.log(`RPC client connected to '${this.microservice.name}'.`);
          this.clients.add(ws);

          // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/require-await
          ws.on("message", async (messageBuffer: Buffer) => {
            void (async (): Promise<void> => {
              let rpcRequest: RPCRequest;
              try {
                const messageString = messageBuffer.toString("utf8"); // Specify encoding
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                rpcRequest = JSON.parse(messageString);
                if (
                  rpcRequest.type !== "call" ||
                  !rpcRequest.method ||
                  !rpcRequest.id ||
                  !Array.isArray(rpcRequest.args)
                ) {
                  throw new Error("Invalid RPC request format");
                }
              } catch (error) {
                ws.send(
                  JSON.stringify({
                    type: "response",
                    id: null,
                    error: (error as Error).message || "Invalid request format",
                  })
                );
                return;
              }

              const methodEntry = this.microservice.getMethod(rpcRequest.method);
              let response: RPCResponse;

              if (methodEntry) {
                const context: PluginContext = {
                  name: this.microservice.name,
                  transportType: "rpc",
                  end: async () => {
                    await this.microservice.stop();
                  },
                  plugin: {
                    request: { rpcMessage: rpcRequest, source: "rpc" },
                    response: null,
                    next: async () => {
                      /* no-op for direct method calls in RPC */
                    },
                  },
                  methods: this.microservice.getMethods(), // Use public getter
                  rpcContext: {
                    // Example of adding RPC-specific details
                    clientId:
                      (ws as unknown as { _socket: { remoteAddress: string; remotePort: number } })
                        ._socket?.remoteAddress +
                      ":" +
                      (ws as unknown as { _socket: { remoteAddress: string; remotePort: number } })
                        ._socket?.remotePort, // More specific client ID
                    requestId: rpcRequest.id,
                  },
                };
                try {
                  const result = await methodEntry.handler(context, ...(rpcRequest.args || []));
                  response = { type: "response", id: rpcRequest.id, result: result };
                } catch (error) {
                  console.error(`Error executing RPC method '${rpcRequest.method}':`, error);
                  response = {
                    type: "response",
                    id: rpcRequest.id,
                    error: (error as Error).message || "Method execution error",
                  };
                  // Emitting onError to the microservice instance
                  if (this.microservice.emit) {
                    // Check if _emit exists (it's private)
                    await this.microservice.emit("onError", error, "rpcMethodExecution");
                  }
                }
              } else {
                response = {
                  type: "response",
                  id: rpcRequest.id,
                  error: `Method '${rpcRequest.method}' not found`,
                };
              }
              ws.send(JSON.stringify(response));
            })();
          });

          ws.on("close", () => {
            console.log(`RPC client disconnected from '${this.microservice.name}'.`);
            this.clients.delete(ws);
          });

          ws.on("error", (error) => {
            // Provide a more descriptive log for client errors
            const clientAddress = (
              ws as unknown as { _socket: { remoteAddress: string; remotePort: number } }
            )._socket
              ? `${(ws as unknown as { _socket: { remoteAddress: string; remotePort: number } })._socket.remoteAddress}:${(ws as unknown as { _socket: { remoteAddress: string; remotePort: number } })._socket.remotePort}`
              : "unknown client";
            console.error(
              `RPC client error for '${this.microservice.name}' [client: ${clientAddress}]:`,
              error
            );
            this.clients.delete(ws);
          });
        });

        this.wss.on("error", (err) => {
          console.error(`RPCTransportAdapter for '${this.microservice.name}' error: `, err);
          this.wss = undefined; // Ensure wss is cleaned up on error
          reject(err);
        });
      } catch (error) {
        console.error(
          `Failed to start RPCTransportAdapter for '${this.microservice.name}':`,
          error
        );
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    console.log(`RPCTransportAdapter for '${this.microservice.name}' stopping...`);
    if (this.wss) {
      for (const client of this.clients) {
        client.terminate();
      }
      this.clients.clear();
      await new Promise<void>((resolve, _reject) => {
        if (!this.wss) {
          // Check if wss is already undefined
          resolve();
          return;
        }
        this.wss.close((err) => {
          if (err) {
            console.error(`Error stopping WebSocket server for '${this.microservice.name}':`, err);
            // Still attempt to resolve, as we want to proceed with shutdown
            // or you might choose to reject(err) if it's critical
            resolve(); // Or reject(err)
            return;
          }
          console.log(`RPCTransportAdapter for '${this.microservice.name}' stopped.`);
          this.wss = undefined;
          resolve();
        });
      });
    } else {
      console.log(
        `RPCTransportAdapter for '${this.microservice.name}' already stopped or not started.`
      );
    }
  }
}
