import { TransportType, MicroserviceOptions } from '@arifwidianto/dawai-common';
import { HandlerMetadata } from '../interfaces/handler-metadata.interface';

export abstract class TransportAdapter {
  protected readonly handlerMap: Map<string | symbol, HandlerMetadata> = new Map();
  public abstract transportType: TransportType | undefined; // Allow undefined for adapters that handle non-standard transports like LLM tools

  constructor(
    protected readonly microserviceOptions: MicroserviceOptions,
    protected readonly serviceInstance: any,
    protected readonly globalMiddleware: any[] = [] // TODO: Define a proper type for middleware
  ) {}

  abstract initialize(): Promise<void>;
  abstract listen(): Promise<void>;
  abstract close(): Promise<void>;

  public registerHandler(
    methodName: string | symbol, // Typically this would be metadata.methodName
    metadata: HandlerMetadata
  ): void {
    // Ensure metadata.methodName is consistent with the key if methodName is derived differently
    if (methodName !== metadata.methodName) {
      console.warn(
        `Registering handler with key "${String(methodName)}" but metadata.methodName is "${metadata.methodName}". Using key.`
      );
    }
    if (this.handlerMap.has(methodName)) {
      // This warning might be too noisy if a method is intentionally exposed via multiple decoratorKeys on the same transport.
      // However, if the map key is truly unique per handler (e.g. methodname + decoratorKey), then it's a valid overwrite warning.
      // Current map key is just methodName, so it will warn if @Cli('cmd1') and @Cli('cmd2') are on same method (which is invalid anyway).
      // Or if @Cli and @Mcp are on same method and both use StdioTransportAdapter.
      console.warn(
        `Handler for method ${String(methodName)} on transport ${this.transportType} with decoratorKey ${metadata.decoratorKey} is being registered. If a handler for this method already exists for this transport, it might be an issue depending on adapter logic.`
      );
    }
    // serviceInstance from constructor should be the one associated with this transport adapter
    // metadata.serviceInstance should ideally match this.serviceInstance
    if (metadata.serviceInstance !== this.serviceInstance) {
        console.warn(`Handler metadata serviceInstance for ${metadata.methodName} does not match adapter's serviceInstance. Using metadata's version.`);
    }

    // The key for handlerMap should be unique for each distinct handler endpoint.
    // Using just methodName might lead to overwrites if one method handles multiple commands/events for the same transport.
    // A composite key like `${metadata.decoratorKey}:${String(methodName)}:${metadata.path}` might be better.
    // For now, keeping methodName as key, but this needs review.
    this.handlerMap.set(methodName, metadata); 
    // console.log(`Registered handler: ${metadata.methodName} (Decorator: ${metadata.decoratorKey}, Path: ${metadata.path || 'N/A'}) for transport ${this.transportType}`);
  }

  /**
   * Determines if this adapter can handle the given handler metadata.
   * Default implementation checks if the transportType matches.
   * Adapters can override this for more complex logic (e.g., an LLM adapter).
   * @param handlerMetadata The metadata of the handler to check.
   * @returns True if the adapter can handle it, false otherwise.
   */
  public canHandle(handlerMetadata: HandlerMetadata): boolean {
    // If this adapter's transportType is undefined (e.g. a generic LLM tool adapter),
    // it might decide to handle based on decoratorKey or other properties.
    if (this.transportType === undefined) {
        // Example: an LLM adapter might handle all DECORATOR_KEY_LLM regardless of handlerMetadata.transportType
        // For now, a generic undefined transport adapter doesn't handle anything by default unless overridden.
        return false; 
    }
    return this.transportType === handlerMetadata.transportType;
  }

  // Placeholder for executeHandler. Concrete adapters will need to implement this
  // based on their specific request/response cycle.
  // The arguments will vary: e.g., (context: any, params: any, body: any)
  // The return type will also vary: e.g., Promise<ResponseShape | void>
  protected abstract executeHandler(
    handlerMetadata: HandlerMetadata,
    ...args: any[] // These args would be mapped from the incoming request by the concrete adapter
  ): Promise<any>;

  // TODO: Add methods for middleware handling if not done in executeHandler
  // protected applyMiddleware(handler: Function, context: any, middleware: any[]): Promise<any>
}
