// dawai-framework/packages/dawai-microservice/src/lib/transports/rpc.ts
import { WebSocketServer, WebSocket } from 'ws'; // Using 'ws' library
import { Microservice } from '../microservice'; 
import type { PluginContext } from '../microservice'; 
import type { ITransportAdapter } from './interfaces';

interface RPCOptions {
  port?: number;
}

interface RPCRequest {
  type: 'call';
  method: string;
  args: any[];
  id: string;
}

interface RPCResponse {
  type: 'response';
  id: string;
  result?: any;
  error?: any;
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
        console.log(`RPCTransportAdapter for '${this.microservice.name}' starting on port ${this.options.port}...`);

        this.wss.on('listening', () => {
          console.log(`RPCTransportAdapter for '${this.microservice.name}' listening on ws://localhost:${this.options.port}`);
          resolve();
        });

        this.wss.on('connection', (ws) => {
          console.log(`RPC client connected to '${this.microservice.name}'.`);
          this.clients.add(ws);

          ws.on('message', async (messageBuffer) => {
            let rpcRequest: RPCRequest;
            try {
              const messageString = messageBuffer.toString();
              rpcRequest = JSON.parse(messageString);
              if (rpcRequest.type !== 'call' || !rpcRequest.method || !rpcRequest.id || !Array.isArray(rpcRequest.args)) {
                throw new Error('Invalid RPC request format');
              }
            } catch (error) {
              ws.send(JSON.stringify({ type: 'response', id: null, error: (error as Error).message || 'Invalid request format' }));
              return;
            }

            const methodEntry = this.microservice.getMethod(rpcRequest.method);
            let response: RPCResponse;

            if (methodEntry) {
              const context: PluginContext = {
                name: this.microservice.name,
                transportType: 'rpc',
                end: async () => { await this.microservice.stop(); },
                plugin: {
                  request: { rpcMessage: rpcRequest, source: 'rpc' }, 
                  response: null, 
                  next: async () => { /* no-op for direct method calls in RPC */ },
                },
                methods: this.microservice.methods, // Populate methods for direct call context
                rpcContext: { // Example of adding RPC-specific details
                  clientId: ws.toString(), // Could be a more sophisticated client ID
                  requestId: rpcRequest.id 
                }
              };
              try {
                const result = await methodEntry.handler(context, ...(rpcRequest.args || []));
                response = { type: 'response', id: rpcRequest.id, result: result };
              } catch (error) {
                console.error(`Error executing RPC method '${rpcRequest.method}':`, error);
                response = { type: 'response', id: rpcRequest.id, error: (error as Error).message || 'Method execution error' };
                // Emitting onError to the microservice instance
                if (this.microservice['_emit']) { // Check if _emit exists (it's private)
                  await this.microservice['_emit']('onError', error, 'rpcMethodExecution');
                }
              }
            } else {
              response = { type: 'response', id: rpcRequest.id, error: `Method '${rpcRequest.method}' not found` };
            }
            ws.send(JSON.stringify(response));
          });

          ws.on('close', () => {
            console.log(`RPC client disconnected from '${this.microservice.name}'.`);
            this.clients.delete(ws);
          });

          ws.on('error', (error) => {
            console.error(`RPC client error for '${this.microservice.name}':`, error);
            this.clients.delete(ws); 
          });
        });

        this.wss.on('error', (err) => {
          console.error(`RPCTransportAdapter for '${this.microservice.name}' error: `, err);
          this.wss = undefined; // Ensure wss is cleaned up on error
          reject(err); 
        });

      } catch (error) {
        console.error(`Failed to start RPCTransportAdapter for '${this.microservice.name}':`, error);
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
      await new Promise<void>((resolve, reject) => {
        if (!this.wss) { // Check if wss is already undefined
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
        console.log(`RPCTransportAdapter for '${this.microservice.name}' already stopped or not started.`);
    }
  }
}
