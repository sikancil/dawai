import { TransportAdapter } from '../base/transport.adapter';
import { StdioOptions } from '../microservice.options';
import * as readline from 'readline';
import { metadataStorage } from '../decorators/metadata.storage';
import { ParameterType } from '../decorators/parameter.options';
import { ZodError, ZodSchema } from 'zod';
import { DawaiMiddleware, MiddlewareType } from '../core/middleware.interface'; // Added for middleware

interface CliCommandDetails {
  methodName: string; // Added to retrieve full method metadata later
  handlerFn: Function;
  serviceInstance: any;
  commandOptions: any; // From @cli decorator (contains schema, description, etc.)
  paramMetadatas?: any[]; // Parameters for the handlerFn itself
}

export class StdioTransportAdapter extends TransportAdapter {
  public static readonly configKey = 'stdio';

  private rl!: readline.Interface;
  private adapterOptions!: StdioOptions['options']; // Renamed to avoid conflict with argument 'options'
  // To store registered CLI commands: Map<commandName, details>
  private cliCommands: Map<string, CliCommandDetails> = new Map();

  constructor() {
    super();
  }

  async initialize(config: StdioOptions): Promise<void> {
    if (config.enabled === false) {
      console.log('StdioTransportAdapter is disabled by configuration. Skipping initialization.');
      return;
    }
    this.adapterOptions = config.options || { interactive: false };
    console.log(`StdioTransportAdapter initialized. Interactive: ${this.adapterOptions.interactive}`);
    // readline setup will happen in listen() if interactive
  }

  async listen(): Promise<void> {
    if (this.adapterOptions?.interactive) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'DAWAI_CLI> '
      });

      this.rl.prompt();

      this.rl.on('line', async (line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          const [command, ...args] = trimmedLine.split(/\s+/);
          const commandDetail = this.cliCommands.get(command);

          if (commandDetail) {
            try {
              const { serviceInstance, handlerFn, commandOptions: cliOptions, paramMetadatas, methodName: cmdMethodName } = commandDetail;
              const methodMetadata = metadataStorage.getMethodMetadata(serviceInstance.constructor, cmdMethodName);
              const middlewareTypes: MiddlewareType[] | undefined = methodMetadata?.useMiddleware;

              // Argument Parsing
              const parsedArgs: Record<string, any> = {};
              const positionalArgs: string[] = [];
              for (const arg of args) {
                if (arg.startsWith('--')) {
                  const [key, ...valueParts] = arg.substring(2).split('=');
                  parsedArgs[key] = valueParts.length > 0 ? valueParts.join('=') : true;
                } else {
                  positionalArgs.push(arg);
                }
              }

              const executeOriginalCliHandler = async () => {
                // Assign positional args if needed by schema, e.g., parsedArgs._ = positionalArgs;
                // For now, primary input for schema is parsedArgs from --key=value flags.
                let inputDataForValidation: any = parsedArgs; // Now refers to parsedArgs from outer scope
                if (positionalArgs.length > 0 && Object.keys(parsedArgs).length === 0) {
                  // If only positional args are present, and schema might expect an array or specific object structure
                  // This part might need refinement based on how schemas for positional args are defined
                  // For a simple case, if schema expects an array, and only positionals are given:
                  // inputDataForValidation = positionalArgs;
                  // However, for now, we assume schema primarily targets named args.
                  // If schema expects an object and gets an array, it will likely fail unless schema is `z.array(z.string())` or similar.
                  // If the schema is for an object, and we have positionals, how to map them?
                  // Defaulting to parsedArgs, but can expose positionalArgs via CTX.
                }


                // Zod Schema Validation
                if (cliOptions.schema) {
                  const validationResult = (cliOptions.schema as ZodSchema<any>).safeParse(inputDataForValidation);
                  if (!validationResult.success) {
                    console.error(`Invalid arguments for command '${command}':`);
                    const fieldErrors = validationResult.error.flatten().fieldErrors;
                    for (const field in fieldErrors) {
                      console.error(`  ${field}: ${(fieldErrors[field] as string[]).join(', ')}`);
                    }
                    this.rl.prompt();
                    return;
                  }
                  inputDataForValidation = validationResult.data;
                }

                // Argument Injection
                const handlerArgs: any[] = [];
                if (paramMetadatas) {
                  for (const paramMeta of paramMetadatas) {
                    switch (paramMeta.type) {
                      case ParameterType.BODY:
                        handlerArgs[paramMeta.index] = inputDataForValidation;
                        break;
                      case ParameterType.PARAMS:
                        if (paramMeta.key) {
                          handlerArgs[paramMeta.index] = inputDataForValidation[paramMeta.key];
                        } else {
                          handlerArgs[paramMeta.index] = undefined;
                        }
                        break;
                      case ParameterType.CTX:
                        handlerArgs[paramMeta.index] = { command, rawArgs: args, parsedArgs: inputDataForValidation, positionalArgs };
                        break;
                      default:
                        handlerArgs[paramMeta.index] = undefined;
                    }
                  }
                }

                const result = await handlerFn(...handlerArgs);
                if (result !== undefined) {
                  console.log(JSON.stringify(result, null, 2));
                }
              };

              if (middlewareTypes && middlewareTypes.length > 0) {
                const middlewares = middlewareTypes.map(mw => {
                  if (typeof mw === 'function' && mw.prototype?.use) {
                    return new (mw as new (...args: any[]) => DawaiMiddleware)();
                  }
                  return mw as DawaiMiddleware;
                }).filter(mw => typeof mw.use === 'function');

                // CLI context might evolve, for now it's similar to original handler's CTX
                const cliContext = {
                  command,
                  rawArgs: args,
                  parsedArgs, // Now available from this scope
                  positionalArgs // Now available from this scope
                };

                let chain = executeOriginalCliHandler;
                for (let i = middlewares.length - 1; i >= 0; i--) {
                  const currentMiddleware = middlewares[i];
                  const nextInChain = chain;
                  // Middleware for CLI might need a different context structure or access to parsedArgs
                  // For now, pass a generic context; `nextInChain` will eventually parse/validate args
                  chain = async () => currentMiddleware.use(cliContext, nextInChain);
                }
                await chain();
              } else {
                await executeOriginalCliHandler();
              }
            } catch (error) {
              console.error(`Error executing command ${command}:`, error instanceof Error ? error.message : String(error));
            }
          } else if (command === 'exit' || command === 'quit') {
            this.rl.close();
            return; // Prevent prompt after exit
          }
          else {
            console.log(`Unknown command: ${command}. Type 'exit' or 'quit' to close.`);
          }
        }
        this.rl.prompt();
      }).on('close', () => {
        console.log('StdioTransportAdapter exiting interactive mode.');
        process.exit(0);
      });
    } else {
      // Non-interactive mode: listen for piped input or specific commands?
      // For now, non-interactive mode will do nothing until specific requirements are given.
      console.log('StdioTransportAdapter in non-interactive mode. No specific non-interactive logic implemented yet.');
    }
  }

  async close(): Promise<void> {
    if (this.rl) {
      this.rl.close();
    }
    console.log('StdioTransportAdapter closed.');
  }

  // This method will be used by @cli decorator to register commands
  registerHandler(methodName: string, metadata: any, handlerFn: Function, serviceInstance: any): void {
    if (metadata?.cli) { // 'cli' is the key used by @cli decorator
      const cliOptions = metadata.cli; // These are CliDecoratorOptions
      if (cliOptions.command) {
        console.log(`StdioTransportAdapter: Registering CLI command '${cliOptions.command}' to ${serviceInstance.constructor.name}.${methodName}`);
        const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
        this.cliCommands.set(cliOptions.command, {
          methodName, // Store methodName
          handlerFn: handlerFn.bind(serviceInstance),
          serviceInstance,
          commandOptions: cliOptions, // This is CliDecoratorOptions
          paramMetadatas
        });
      } else {
        console.warn(`StdioTransportAdapter: CLI command for ${serviceInstance.constructor.name}.${methodName} is missing 'command' option.`);
      }
    }
  }
}
