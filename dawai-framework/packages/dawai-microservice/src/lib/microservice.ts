// In dawai-framework/packages/dawai-microservice/src/lib/microservice.ts
import { StdIOTransportAdapter } from './transports/stdio';
import { RPCTransportAdapter } from './transports/rpc'; // Added
import type { ITransportAdapter } from './transports/interfaces';

// Define types for options and context early, as they'll be used across methods
export interface MicroserviceOptions {
  name: string;
  transport: string; // Later, this could be a more specific enum or union type
  // version?: string; // Example of another potential option
  // rpcOptions?: any; // Placeholder for future RPC specific options
}

// This context will evolve, but good to define its basic shape early
// IMicroserviceContext might merge or evolve with PluginContext ideas over time.
export interface IMicroserviceContext {
  readonly name: string;
  readonly transportType: string;
  // end(): void; // Will be added in lifecycle step
}

// Types for middleware support
export interface PluginContext {
  readonly name: string;
  readonly transportType: string;
  end: () => Promise<void>;
  plugin: {
    request: any;
    response: any;
    next: () => Promise<void>;
  };
  [key: string]: any; // Allow for extensibility for plugins to add more to context
}

export type MiddlewareFunction = (ctx: PluginContext) => Promise<void> | void;

// Define the type for method handlers
export type MethodHandler = (ctx: PluginContext, ...args: any[]) => Promise<any> | any;

// --- New Lifecycle and Event System Additions ---
export type LifecycleEvent =
  | 'onBeforeStart'
  | 'onAfterStart'
  | 'onBeforeRun'
  | 'onAfterRun'
  | 'onBeforeStop'
  | 'onAfterStop'
  | 'onError';

export type LifecycleEventHandler = (...args: any[]) => Promise<void> | void;
// --- End of New Lifecycle and Event System Additions ---

export class Microservice {
  public readonly name: string;
  public readonly transportType: string;
  private middlewares: MiddlewareFunction[] = [];
  private methods: Map<string, MethodHandler> = new Map(); // To store registered methods
  private transportAdapter: ITransportAdapter | null = null;
  private options: MicroserviceOptions; // Store options if needed for transport
  
  // --- New Lifecycle and Event System Properties ---
  private lifecycleEvents: Map<LifecycleEvent, LifecycleEventHandler[]> = new Map();
  private isRunning: boolean = false; // To help manage state for run/stop
  // --- End of New Lifecycle and Event System Properties ---

  constructor(options: MicroserviceOptions) {
    this.options = options; // Store options
    this.name = options.name;
    this.transportType = options.transport;

    if (!this.name) {
      throw new Error('Microservice name must be provided.');
    }
    if (!this.transportType) {
      throw new Error('Microservice transport type must be provided.');
    }

    console.log(`Microservice '${this.name}' initialized with transport '${this.transportType}'.`);
    this.setupSignalHandlers(); // Call to setup signal handlers
  }

  // --- New Lifecycle and Event System Methods ---
  private setupSignalHandlers(): void {
    if (typeof process !== 'undefined' && process.on) {
      process.on('SIGINT', async () => {
        console.log(`Microservice '${this.name}' received SIGINT. Shutting down...`);
        await this.stop();
        process.exit(0); 
      });
      process.on('SIGTERM', async () => {
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

  private async _emit(eventName: LifecycleEvent, ...args: any[]): Promise<void> {
    const handlers = this.lifecycleEvents.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        console.error(`Error in '${eventName}' handler for microservice '${this.name}':`, error);
        const errorHandlers = this.lifecycleEvents.get('onError') || [];
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

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn(`Microservice '${this.name}' is already running.`);
      return;
    }
    await this._emit('onBeforeStart');
    console.log(`Microservice '${this.name}' starting...`);
    
    // --- Modified for Transport Adapter ---
    if (this.transportType === 'stdio') {
      this.transportAdapter = new StdIOTransportAdapter(this);
      await this.transportAdapter.start();
    } else if (this.transportType === 'rpc') {
      // Assuming MicroserviceOptions might have an rpcOptions field or similar
      // For now, using default RPCTransportAdapter options
      // const rpcOptions = (this.options as any).rpcOptions; // Example if options are passed
      this.transportAdapter = new RPCTransportAdapter(this /*, rpcOptions */); // Pass rpcOptions if available
      await this.transportAdapter.start();
    } else if (this.transportType) {
      console.warn(`Unknown transport type: '${this.transportType}'. No transport adapter started.`);
    }
    // --- End of Modification ---

    this.isRunning = true; 
    await this._emit('onAfterStart');
    console.log(`Microservice '${this.name}' has started.`);
  }

  public async run(): Promise<void> {
    if (!this.isRunning) {
      console.warn(`Microservice '${this.name}' is not running. Call start() first.`);
      return;
    }
    await this._emit('onBeforeRun');
    console.log(`Microservice '${this.name}' is running... (Primary logic would execute here)`);
  }

  public async stop(): Promise<void> {
    if (!this.isRunning && !this.transportAdapter) { 
      return;
    }
    await this._emit('onBeforeStop');
    console.log(`Microservice '${this.name}' stopping...`);

    if (this.transportAdapter) {
      await this.transportAdapter.stop();
      this.transportAdapter = null;
    }

    const wasRunning = this.isRunning; 
    this.isRunning = false; 

    if(wasRunning){ 
        await this._emit('onAfterRun'); 
    }
    await this._emit('onAfterStop');
    console.log(`Microservice '${this.name}' has stopped.`);
  }
  // --- End of New Lifecycle and Event System Methods ---

  public use(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware);
    return this;
  }

  public method(methodName: string, handler: MethodHandler): this {
    if (this.methods.has(methodName)) {
      console.warn(`Method '${methodName}' in microservice '${this.name}' is being overwritten.`);
    }
    this.methods.set(methodName, handler);
    return this;
  }

  public getMethod(methodName: string): MethodHandler | undefined {
    return this.methods.get(methodName);
  }

  public async _handleRequest(requestPayload: any): Promise<any> {
    let finalResponse: any = null;
    const executeMiddlewareAtIndex = async (index: number, currentRequest: any, currentResponse: any): Promise<void> => {
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
        };
        try {
          await middleware(ctx);
          finalResponse = ctx.plugin.response; 
        } catch (error) {
          console.error(`Error in middleware ${middleware.name || `at index ${index}`} for microservice '${this.name}':`, error);
          finalResponse = { error: `Middleware error in ${this.name}: ${(error as Error).message}` };
          await this._emit('onError', error, 'middlewareExecution'); 
        }
      } else {
        finalResponse = currentResponse;
      }
    };
    await executeMiddlewareAtIndex(0, requestPayload, {}); 
    return finalResponse;
  }
}
