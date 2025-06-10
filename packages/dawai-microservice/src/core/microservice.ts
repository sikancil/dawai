import { TransportAdapter } from './transport.adapter';
import {
  TransportType,
  metadataStorage,
  ClassMetadata,
  MicroserviceOptions,
  // Import specific decorator options for type casting
  CrudDecoratorOptions, WsDecoratorOptions, SseDecoratorOptions,
  CliDecoratorOptions, RpcDecoratorOptions, LlmDecoratorOptions,
  McpDecoratorOptions, A2aDecoratorOptions,
  // Import metadata keys
  TRANSPORT_TYPE_METADATA, DECORATOR_KEY_METADATA, SCHEMA_METADATA,
  DISABLED_METADATA, HANDLER_OPTIONS_METADATA, MIDDLEWARE_METADATA,
  // Import decorator key constants
  DECORATOR_KEY_CRUD, DECORATOR_KEY_WS, DECORATOR_KEY_SSE, DECORATOR_KEY_CLI,
  DECORATOR_KEY_RPC, DECORATOR_KEY_LLM, DECORATOR_KEY_MCP, DECORATOR_KEY_A2A,
  ParameterDecoratorMetadata as ParameterMetadata // Import and alias ParameterDecoratorMetadata
} from '@arifwidianto/dawai-common';
import { HandlerMetadata, TransportAdapterConstructor } from '../interfaces'; // Adjusted import path

interface ServiceClass {
  new(...args: any[]): any;
}

export class Microservice {
  private transportAdapters: TransportAdapter[] = [];
  private serviceInstance: any;
  private microserviceConstructorOptions: MicroserviceOptions;

  constructor(private serviceClass: ServiceClass, microserviceConstructorOptions?: MicroserviceOptions) {
    this.serviceInstance = new this.serviceClass();
    this.microserviceConstructorOptions = microserviceConstructorOptions || {};
  }

  public getServiceInstance(): any {
    return this.serviceInstance;
  }

  private _autoRegisterTransportsFromDecorators(): void {
    const classMeta = metadataStorage.getClassMetadata(this.serviceClass) as ClassMetadata & { webservice?: any, stdio?: any };
    if (!classMeta) {
      return;
    }

    if (classMeta.webservice && classMeta.webservice.enabled !== false) {
      const isAlreadyRegistered = this.transportAdapters.some(
        adapter => adapter.transportType === TransportType.WEBSERVICE
      );
      if (!isAlreadyRegistered) {
        try {
          const packageName = '@arifwidianto/dawai-webservice';
          const { WebServiceTransportAdapter: AdapterConstructor } = 
            require(packageName) as { WebServiceTransportAdapter: TransportAdapterConstructor };
          if (!this.microserviceConstructorOptions.webservice && classMeta.webservice) {
            this.microserviceConstructorOptions.webservice = { ...classMeta.webservice };
          } else if (this.microserviceConstructorOptions.webservice && classMeta.webservice) {
            this.microserviceConstructorOptions.webservice = {
              ...this.microserviceConstructorOptions.webservice,
              ...classMeta.webservice,
              options: {
                ...(this.microserviceConstructorOptions.webservice.options || {}),
                ...(classMeta.webservice.options || {}),
              }
            };
          } else if (!this.microserviceConstructorOptions.webservice) {
            this.microserviceConstructorOptions.webservice = { enabled: true, options: {} };
          }
          // Pass this.serviceInstance to the adapter constructor
          const adapter = new AdapterConstructor(this.microserviceConstructorOptions, this.serviceInstance);
          this.registerTransport(adapter);
          console.log('Auto-registered WebServiceTransportAdapter based on @webservice decorator.');
        } catch (e) {
          console.warn('Failed to auto-register WebServiceTransportAdapter. Ensure @arifwidianto/dawai-webservice is installed. Error: ', (e instanceof Error ? e.message : String(e)));
        }
      }
    }

    if (classMeta.stdio && classMeta.stdio.enabled !== false) {
      const isAlreadyRegistered = this.transportAdapters.some(
        adapter => adapter.transportType === TransportType.STDIO
      );
      if (!isAlreadyRegistered) {
        try {
          const packageName = '@arifwidianto/dawai-stdio';
          const { StdioTransportAdapter: AdapterConstructor } = 
            require(packageName) as { StdioTransportAdapter: TransportAdapterConstructor };
          if (!this.microserviceConstructorOptions.stdio && classMeta.stdio) {
            this.microserviceConstructorOptions.stdio = { ...classMeta.stdio };
          } else if (this.microserviceConstructorOptions.stdio && classMeta.stdio) {
            this.microserviceConstructorOptions.stdio = {
              ...this.microserviceConstructorOptions.stdio,
              ...classMeta.stdio,
              options: {
                ...(this.microserviceConstructorOptions.stdio.options || {}),
                ...(classMeta.stdio.options || {}),
              }
            };
          } else if (!this.microserviceConstructorOptions.stdio) {
            this.microserviceConstructorOptions.stdio = { enabled: true };
          }
          // Pass this.serviceInstance to the adapter constructor
          const adapter = new AdapterConstructor(this.microserviceConstructorOptions, this.serviceInstance);
          this.registerTransport(adapter);
          console.log('Auto-registered StdioTransportAdapter based on @stdio decorator.');
        } catch (e) {
          console.warn('Failed to auto-register StdioTransportAdapter. Ensure @arifwidianto/dawai-stdio is installed. Error: ', (e instanceof Error ? e.message : String(e)));
        }
      }
    }
  }

  public registerTransport(adapterInstance: TransportAdapter): void {
    this.transportAdapters.push(adapterInstance);
  }

  private _createHandlerMetadata(
    methodName: string,
    handlerFn: Function,
    parameterMetadatas: ParameterMetadata[],
    actualDecoratorKey: string,
    handlerOptions: any,
    transportType: TransportType | undefined,
    schema: any,
    middleware: any[]
  ): HandlerMetadata | null {
    let path: string | undefined;
    let httpMethod: HandlerMetadata['httpMethod'];

    switch (actualDecoratorKey) {
      case DECORATOR_KEY_CRUD:
        path = (handlerOptions as CrudDecoratorOptions).endpoint;
        httpMethod = (handlerOptions as CrudDecoratorOptions).method;
        break;
      case DECORATOR_KEY_WS:
        path = (handlerOptions as WsDecoratorOptions).event;
        break;
      case DECORATOR_KEY_SSE:
        path = (handlerOptions as SseDecoratorOptions).endpoint;
        httpMethod = (handlerOptions as SseDecoratorOptions).method;
        break;
      case DECORATOR_KEY_CLI:
        path = (handlerOptions as CliDecoratorOptions).command;
        break;
      case DECORATOR_KEY_RPC:
        path = (handlerOptions as RpcDecoratorOptions).command;
        break;
      case DECORATOR_KEY_LLM:
        path = (handlerOptions as LlmDecoratorOptions).tool;
        break;
      case DECORATOR_KEY_MCP:
        path = (handlerOptions as McpDecoratorOptions).command;
        break;
      case DECORATOR_KEY_A2A:
        path = (handlerOptions as A2aDecoratorOptions).command;
        break;
      default:
        console.warn(`Unknown actualDecoratorKey: ${actualDecoratorKey} for method ${methodName}. Skipping.`);
        return null;
    }

    return {
      methodName: methodName,
      handlerFn,
      serviceInstance: this.serviceInstance,
      transportType: transportType,
      path,
      httpMethod,
      schema,
      parameters: parameterMetadatas,
      middleware: middleware,
      decoratorKey: actualDecoratorKey,
      options: handlerOptions, // Store the original decorator options
    };
  }

  public async bootstrap(): Promise<void> {
    this._autoRegisterTransportsFromDecorators();

    // Initialize adapters AFTER handlers are registered by this bootstrap method.
    // The original order was: initialize adapters, then register handlers.
    // This might be an issue if initialize() depends on handlers already being there (e.g. StdioTransportAdapter's handleInput).
    // However, StdioTransportAdapter's initialize() calls handleInput() which needs the map.
    // Let's keep original adapter init order for now, but be mindful.
    // The main handler registration loop is below. Adapters are initialized first.

    const methodDecoratorsMapByMethod = metadataStorage.getAllMethodMetadata(this.serviceClass);

    if (methodDecoratorsMapByMethod && methodDecoratorsMapByMethod.size > 0) {
      for (const [methodName, methodDecoratorsMapValue] of methodDecoratorsMapByMethod.entries()) {
        if (typeof this.serviceInstance[methodName] !== 'function') {
          // This case should ideally not happen if metadata is correctly associated with actual methods
          console.warn(`[Dawai Microservice] Metadata found for '${methodName}', but it's not a function on the service instance. Skipping.`);
          continue;
        }
        const handlerFn = (this.serviceInstance[methodName] as Function).bind(this.serviceInstance);
        const parameterMetadatas: ParameterMetadata[] = metadataStorage.getParameterMetadata(this.serviceClass, methodName as string) || [];

        const methodSpecificMetadata = methodDecoratorsMapValue as any; // Cast to any to access dynamic keys
        const middleware = methodSpecificMetadata[MIDDLEWARE_METADATA] || [];

        for (const decoratorApplicationKeySymbol in methodSpecificMetadata) {
          if (decoratorApplicationKeySymbol === MIDDLEWARE_METADATA) {
            continue;
          }

          const decoratorStoredMetadata = methodSpecificMetadata[decoratorApplicationKeySymbol];

          const checkFailed = !decoratorStoredMetadata ||
            typeof decoratorStoredMetadata !== 'object' ||
            !decoratorStoredMetadata[DECORATOR_KEY_METADATA]; // DECORATOR_KEY_METADATA is a Symbol

          if (checkFailed) {
            // Optionally, keep a more permanent, less verbose warning if this scenario is critical
            // console.warn(`[Dawai Microservice] Skipping decorator application for ${methodName} due to missing or malformed metadata for key ${String(decoratorApplicationKeySymbol)}.`);
            continue;
          }

          const transportType = decoratorStoredMetadata[TRANSPORT_TYPE_METADATA] as TransportType | undefined;
          const actualDecoratorKey = decoratorStoredMetadata[DECORATOR_KEY_METADATA] as string; // This is a Symbol, will be stringified by log
          const schema = decoratorStoredMetadata[SCHEMA_METADATA];
          const isDisabled = decoratorStoredMetadata[DISABLED_METADATA] || false;
          const handlerOptions = decoratorStoredMetadata[HANDLER_OPTIONS_METADATA];

          if (isDisabled) {
            continue;
          }

          if (!handlerOptions) {
            continue;
          }

          const finalHandlerMetadata = this._createHandlerMetadata(
            methodName as string,
            handlerFn,
            parameterMetadatas,
            actualDecoratorKey,
            handlerOptions,
            transportType,
            schema,
            middleware
          );

          if (finalHandlerMetadata) {
            let handledByAdapter = false;
            for (const adapter of this.transportAdapters) {
              const adapterName = adapter.constructor.name;
              if (adapter.canHandle(finalHandlerMetadata)) {
                adapter.registerHandler(methodName as string, finalHandlerMetadata);
                handledByAdapter = true;
                // Potentially break if only one adapter should handle, or log if multiple can.
              } else {
              }
            }
            if (!handledByAdapter) {
            }
          } else {
          }
        }
      }
    } else {
    }

    // Initialize adapters AFTER handlers have been registered.
    for (const adapter of this.transportAdapters) {
      await adapter.initialize();
    }

    if (typeof this.serviceInstance.onModuleInit === 'function') {
      try {
        await this.serviceInstance.onModuleInit();
      } catch (error) {
        console.error(`Error during onModuleInit for ${this.serviceClass.name}:`, error);
        throw error;
      }
    }
  }

  public listen(): Promise<void[]> {
    const listenPromises: Promise<void>[] = [];
    if (this.transportAdapters.length === 0) {
      console.log(`No transport adapters registered or enabled for ${this.serviceClass.name}. Microservice will not listen on any transport.`);
    }
    for (const adapter of this.transportAdapters) {
      const transportConfigKey = (adapter.constructor as any).configKey || (adapter.transportType !== undefined ? String(adapter.transportType).toLowerCase() : 'unknown_transport');
      const config = (this.microserviceConstructorOptions as any)[transportConfigKey] || {};

      if (config.enabled !== false) {
        listenPromises.push(adapter.listen());
      } else {
        console.log(`Transport adapter for ${transportConfigKey} is disabled. Skipping listen.`);
      }
    }
    return Promise.all(listenPromises);
  }

  public async close(): Promise<void[]> {
    if (typeof this.serviceInstance.onApplicationShutdown === 'function') {
      try {
        console.log(`Calling onApplicationShutdown for ${this.serviceClass.name}`);
        await this.serviceInstance.onApplicationShutdown();
      } catch (error) {
        console.error(`Error during onApplicationShutdown for ${this.serviceClass.name}:`, error);
      }
    }

    const closePromises: Promise<void>[] = [];
    for (const adapter of this.transportAdapters) {
      closePromises.push(adapter.close());
    }
    return Promise.all(closePromises);
  }
}
