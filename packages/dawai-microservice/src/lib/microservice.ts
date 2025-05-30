import { StdIOTransportAdapter } from "./transports/stdio.js";
import { RPCTransportAdapter } from "./transports/rpc.js"; // Added
import type { ITransportAdapter } from "./transports/interfaces.js";
import type {
  LLMToolOptions,
  MCPMethodOptions,
  A2AMethodOptions,
  RestEndpointOptions,
} from "./decorators/method-decorators.js";

// Define types for options and context early, as they'll be used across methods
export interface MicroserviceOptions {
  name: string;
  transport: string; // Later, this could be a more specific enum or union type
  // version?: string; // Example of another potential option
  rpcOptions?: { port?: number }; // Added for RPC specific options
}

// This context will evolve, but good to define its basic shape early
// IMicroserviceContext might merge or evolve with PluginContext ideas over time.
export interface IMicroserviceContext {
  readonly name: string;
  readonly transportType: string;
  // end(): void; // Will be added in lifecycle step
}

// Types for middleware support

// Specific type for RPC message within the request
export interface RpcMessagePayload {
  type: "call" | "response" | "error"; // Assuming these types based on typical RPC
  id: string;
  method?: string; // Optional for response/error
  args?: unknown[]; // Optional for response/error
  result?: unknown; // Optional for call/error
  error?: unknown; // Optional for call/result
}

export interface PluginContext {
  readonly name: string;
  readonly transportType: string;
  readonly methods: ReadonlyMap<string, MethodRegistryEntry>; // Added for middleware access
  end: () => Promise<void>;
  plugin: {
    request: unknown; // Remains unknown for general middleware
    response: unknown;
    next: () => Promise<void>;
  };
  // Context specific to transport types
  rpcContext?: {
    clientId?: string;
    rawRequest?: RpcMessagePayload; // Store the parsed RPC message here
    requestId?: string; // Added to store the request ID from the RPC message
  };
  stdioContext?: {
    rawInput?: string; // Example for stdio
  };
  [key: string]: unknown; // Allow for extensibility for plugins to add more to context
}

export type MiddlewareFunction = (ctx: PluginContext) => Promise<void> | void;

// Define the type for method handlers
export type MethodHandler = (ctx: PluginContext, ...args: unknown[]) => Promise<unknown>; // Removed | unknown

// --- New Lifecycle and Event System Additions ---
export type LifecycleEvent =
  | "onBeforeStart"
  | "onAfterStart"
  | "onBeforeRun"
  | "onAfterRun"
  | "onBeforeStop"
  | "onAfterStop"
  | "onError";

export type LifecycleEventHandler = (...args: unknown[]) => Promise<void> | void;
// --- End of New Lifecycle and Event System Additions ---

// --- New Decorator and Method Registry Types ---
export interface DecoratorMetadata {
  llmTool?: LLMToolOptions;
  mcpMethod?: MCPMethodOptions;
  a2aMethod?: A2AMethodOptions;
  restEndpoint?: RestEndpointOptions;
  // Add other decorator option types here if they exist
}

export interface MethodRegistryEntry {
  name: string;
  handler: MethodHandler;
  decorators: DecoratorMetadata;
}
// --- End of New Decorator and Method Registry Types ---

export class Microservice {
  public readonly name: string;
  public readonly transportType: string;
  private middlewares: MiddlewareFunction[] = [];
  private _methods: Map<string, MethodRegistryEntry> = new Map(); // To store registered methods
  private transportAdapter: ITransportAdapter | null = null;
  // --- New Lifecycle and Event System Properties ---
  private lifecycleEvents: Map<LifecycleEvent, LifecycleEventHandler[]> = new Map();
  private _running: boolean = false; // To help manage state for run/stop
  private options: MicroserviceOptions; // Store options if needed for transport

  // --- End of New Lifecycle and Event System Properties ---

  constructor(options: MicroserviceOptions) {
    this.options = options; // Store options
    this.name = options.name;
    this.transportType = options.transport;

    if (!this.name) {
      throw new Error("Microservice name must be provided.");
    }
    if (!this.transportType) {
      throw new Error("Microservice transport type must be provided.");
    }

    console.log(`Microservice '${this.name}' initialized with transport '${this.transportType}'.`);
    this.setupSignalHandlers(); // Call to setup signal handlers
  }

  // --- New Lifecycle and Event System Methods ---
  private setupSignalHandlers(): void {
    if (typeof process !== "undefined" && process.on) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      process.on("SIGINT", async () => {
        console.log(`Microservice '${this.name}' received SIGINT. Shutting down...`);
        await this.stop();
        process.exit(0);
      });
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      process.on("SIGTERM", async () => {
        console.log(`Microservice '${this.name}' received SIGTERM. Shutting down...`);
        await this.stop();
        process.exit(0);
      });
    }
  }

  public on(eventName: LifecycleEvent, handler: LifecycleEventHandler): this {
    const handlers = this.lifecycleEvents.get(eventName) || [];
    handlers.push(handler);
    this.lifecycleEvents.set(eventName, handlers);
    return this;
  }

  private async _emit(eventName: LifecycleEvent, ...args: unknown[]): Promise<void> {
    const handlers = this.lifecycleEvents.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        console.error(`Error in '${eventName}' handler for microservice '${this.name}':`, error);
        const errorHandlers = this.lifecycleEvents.get("onError") || [];
        for (const errHandler of errorHandlers) {
          try {
            await errHandler(error, eventName);
          } catch (e) {
            console.error(`Error in 'onError' handler for microservice '${this.name}':`, e);
          }
        }
      }
    }
  }

  public emit(eventName: LifecycleEvent, ...args: unknown[]): Promise<void> {
    // This method is for external use, it will call the private _emit method
    return this._emit(eventName, ...args);
  }

  public get isRunning(): boolean {
    return this._running;
  }

  public async start(): Promise<void> {
    if (this._running) {
      console.warn(`Microservice '${this.name}' is already running.`);
      return;
    }
    await this._emit("onBeforeStart");
    console.log(`Microservice '${this.name}' starting...`);

    // --- Modified for Transport Adapter ---
    if (this.transportType === "stdio") {
      this.transportAdapter = new StdIOTransportAdapter(this);
      await this.transportAdapter.start();
    } else if (this.transportType === "rpc") {
      const rpcOptions = this.options.rpcOptions;
      this.transportAdapter = new RPCTransportAdapter(this, rpcOptions);
      await this.transportAdapter.start();
    } else if (this.transportType) {
      console.warn(
        `Unknown transport type: '${this.transportType}'. No transport adapter started.`
      );
    }
    // --- End of Modification ---

    this._running = true;
    await this._emit("onAfterStart");
    console.log(`Microservice '${this.name}' has started.`);
  }

  public async run(): Promise<void> {
    if (!this._running) {
      console.warn(`Microservice '${this.name}' is not running. Call start() first.`);
      return;
    }
    await this._emit("onBeforeRun");
    console.log(`Microservice '${this.name}' is running... (Primary logic would execute here)`);
  }

  public async stop(): Promise<void> {
    if (!this._running && !this.transportAdapter) {
      return;
    }
    await this._emit("onBeforeStop");
    console.log(`Microservice '${this.name}' stopping...`);

    if (this.transportAdapter) {
      await this.transportAdapter.stop();
      this.transportAdapter = null;
    }

    const wasRunning = this._running;
    this._running = false;

    if (wasRunning) {
      await this._emit("onAfterRun");
    }
    await this._emit("onAfterStop");
    console.log(`Microservice '${this.name}' has stopped.`);
  }
  // --- End of New Lifecycle and Event System Methods ---

  // Changed from private to public to allow access from metadata-utils.ts
  public _registerMethodEntry(entry: MethodRegistryEntry): void {
    if (this._methods.has(entry.name)) {
      console.warn(
        `Method '${entry.name}' in microservice '${this.name}' is being overwritten during registration.`
      );
    }
    this._methods.set(entry.name, entry);
  }

  public use(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware);
    return this;
  }

  public method(methodName: string, handler: MethodHandler): this {
    const entry: MethodRegistryEntry = {
      name: methodName,
      handler: handler,
      decorators: {}, // No decorators when using the simple .method() registration
    };
    this._registerMethodEntry(entry);
    return this;
  }

  public getMethod(methodName: string): MethodRegistryEntry | undefined {
    return this._methods.get(methodName);
  }

  // Added public getter for methods map
  public getMethods(): ReadonlyMap<string, MethodRegistryEntry> {
    return this._methods;
  }

  public async _handleRequest(requestPayload: unknown): Promise<unknown> {
    let finalResponse: unknown = null;
    const executeMiddlewareAtIndex = async (
      index: number,
      currentRequest: unknown,
      currentResponse: unknown
    ): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index];
        const ctx: PluginContext = {
          name: this.name,
          transportType: this.transportType,
          end: async () => {
            console.log(`Microservice '${this.name}': ctx.end() called, initiating stop sequence.`);
            await this.stop();
          },
          plugin: {
            request: currentRequest,
            response: currentResponse,
            next: async () => {
              await executeMiddlewareAtIndex(index + 1, ctx.plugin.request, ctx.plugin.response);
            },
          },
          methods: new Map(this._methods) as ReadonlyMap<string, MethodRegistryEntry>,
          // Initialize transport-specific contexts
          rpcContext:
            this.transportType === "rpc"
              ? { rawRequest: currentRequest as RpcMessagePayload }
              : undefined,
          stdioContext:
            this.transportType === "stdio" ? { rawInput: currentRequest as string } : undefined,
        };
        try {
          await middleware(ctx);
          finalResponse = ctx.plugin.response;
        } catch (error) {
          console.error(
            `Error in middleware ${middleware.name || `at index ${index}`} for microservice '${this.name}':`,
            error
          );
          finalResponse = {
            error: `Middleware error in ${this.name}: ${(error as Error).message}`,
          };
          await this._emit("onError", error, "middlewareExecution");
        }
      } else {
        finalResponse = currentResponse;
      }
    };
    await executeMiddlewareAtIndex(0, requestPayload, {});
    return finalResponse;
  }
}
