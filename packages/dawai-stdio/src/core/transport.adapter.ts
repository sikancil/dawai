import { TransportAdapter, HandlerMetadata } from '@arifwidianto/dawai-microservice';
import {
  TransportType,
  StdioOptions as DawaiStdioOptions, // Alias to avoid conflict if StdioOptions is used locally
  MicroserviceOptions,
  ParameterType,
  CliDecoratorOptions,
  DECORATOR_KEY_CLI // <-- SYMBOL required for grouping commands
} from '@arifwidianto/dawai-common';
import * as readline from 'readline';
import { ZodSchema, ZodObject, ZodTypeAny, ZodArray, ZodBoolean, ZodDefault, ZodEnum, ZodNumber, ZodOptional, ZodString } from 'zod';
import yargs from 'yargs';
import { Argv as YargsArgvType } from 'yargs';
import chalk from 'chalk';
import { StdioContext } from '../interfaces';

export class StdioTransportAdapter extends TransportAdapter {
  public static readonly configKey = 'stdio';
  // this.options refers to the inner options of DawaiStdioOptions (i.e., StdioOptions['options'])
  private readonly options: DawaiStdioOptions['options'];
  private rl: readline.Interface | undefined;
  public transportType: TransportType = TransportType.STDIO;
  private rawCliInputString?: string; // To store raw input for StdioContext

  private frameworkName = '~dawai~';
  private appTitle = `dawai CLI`;

  constructor(
    protected readonly microserviceOptions: MicroserviceOptions,
    protected readonly serviceInstance: any,
    protected readonly globalMiddleware: any[] = []
  ) {
    super(microserviceOptions, serviceInstance, globalMiddleware);

    const stdioServiceOptions = this.microserviceOptions.stdio; // This is DawaiStdioOptions from dawai-common
    let isActuallyInteractive: boolean;

    if (stdioServiceOptions?.options?.interactive !== undefined) {
      isActuallyInteractive = stdioServiceOptions.options.interactive;
    } else {
      // Determine from TTY. process.argv.length <= 2 is a heuristic for "no command provided initially".
      // This implies that if the application is run without any arguments and it's a TTY environment,
      // it should default to interactive mode.
      isActuallyInteractive = !!(process.stdout.isTTY && process.stdin.isTTY && process.argv.length <= 2);
    }

    // Ensure this.options is always an object, even if stdioServiceOptions or stdioServiceOptions.options is undefined.
    this.options = {
      ...(stdioServiceOptions?.options || {}),
      interactive: isActuallyInteractive
    };
  }

  public async initialize(): Promise<void> {
    if (this.options?.interactive) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      // console.log('STDIO transport initialized in interactive mode.');
      // Print welcome message before the first prompt in interactive mode
      console.log(`Interactive CLI is ready. Type '<command> --help' for command options, 'help' for all commands, or 'exit' to quit.`);
      console.log(); // Add a blank line after welcome message for better separation
      this.prompt();
    } else {
      // console.log('STDIO transport initialized in non-interactive mode.');
      // Handle non-interactive execution based on process.argv if not piping
      const args = process.argv.slice(2);
      if (args.length > 0) {
        this.rawCliInputString = args.join(' ');
        await this.handleInput(this.rawCliInputString);
        // Non-interactive mode typically exits after command execution.
        // Consider if process.exit() is needed here or handled by yargs.fail or microservice lifecycle.
      } else { // No args, potentially piped input
        let accumulatedInput = '';
        process.stdin.on('data', (data) => {
          accumulatedInput += data.toString();
        });
        process.stdin.on('end', () => {
          if (accumulatedInput.trim()) {
            this.rawCliInputString = accumulatedInput.trim();
            this.handleInput(this.rawCliInputString);
          }
        });
      }
    }
  }

  public async listen(): Promise<void> {
    if (this.options?.interactive) {
      // Welcome message moved to initialize()
      // console.log(`Interactive CLI is ready. Type '<command> --help' for command options, 'help' for all commands, or 'exit' to quit.`);
    } else {
      // console.log(`STDIO transport is processing input.`);
    }
  }

  public async close(): Promise<void> {
    if (this.rl) {
      this.rl.close();
    }
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('end');
    console.log('STDIO transport closed.');
  }

  private prompt(): void {
    if (!this.rl) return;
    const promptString = this.options?.prompt || '> '; // Use configured prompt or default
    this.rl.question(promptString, async (input) => {
      this.rawCliInputString = input; // Store raw input for context
      if (input.toLowerCase() === 'exit') {
        this.rl?.close();
        // In interactive mode, 'exit' should allow the microservice to shut down gracefully if needed.
        // This might involve signaling the main microservice instance.
        return;
      }

      // Let yargs handle the 'help' command for consistency with '--help'
      // if (input.toLowerCase() === 'help') {
      //   // this.displayGlobalHelp(); // Old custom help
      //   await this.handleInput('--help'); // Pass '--help' to yargs
      //   this.prompt();
      //   return;
      // }
      // For interactive 'help' or '/help', treat it as a command for yargs to process.
      // Yargs should show its main help screen if 'help' is a recognized command or alias.
      // If 'help' is typed, it will be parsed by yargs. If yargs has a help command, it will trigger.
      // If not, yargs' .help() option usually makes '--help' work.
      // We want the input 'help' to behave like 'dawai --help'.
      // The most straightforward way is to let yargs parse 'help' as a command.
      // If yargs doesn't have 'help' as a command, it might fail or suggest.
      // The current yargs setup implicitly has a help screen via .help().
      // To make typing 'help' show the main help:
      if (input.trim().toLowerCase() === 'help' || input.trim().toLowerCase() === '/help') {
        await this.handleInput('--help'); // Force yargs to show its main help screen
        console.log();
        this.prompt(); // Re-prompt
        return;
      }
        await this.handleInput(input);
      // Add a blank line for better visual separation before the next prompt
      // Avoid extra line on initial empty prompt if that could happen
      console.log();

      this.prompt();
    });
  }

  private displayGlobalHelp(): void {
    console.log('\nAvailable commands:');
    this.handlerMap.forEach((handlerMeta) => {
      // Use decoratorKey and options from common @Cli decorator
      if (handlerMeta.decoratorKey === 'cli') {
        const cliOptions = handlerMeta.options as CliDecoratorOptions;
        const command = cliOptions.command;
        const description = cliOptions.description || `Executes ${command}`;
        console.log(`  ${command} - ${description}`);
      }
    });
    console.log("  help - Display this help message.");
    console.log("  exit - Exit the interactive CLI.\n");
    console.log("Type '<command> --help' for options of a specific command.");
  }

  // New private method to group commands
  private groupCommands(): Map<string, { baseMeta?: HandlerMetadata, subMetas: HandlerMetadata[] }> {
    const groups: Map<string, { baseMeta?: HandlerMetadata, subMetas: HandlerMetadata[] }> = new Map();

    this.handlerMap.forEach(meta => {
      // console.log('[DEBUG] groupCommands: Processing meta:', meta.methodName, meta.decoratorKey); // Optional: very verbose
      if (meta.decoratorKey === DECORATOR_KEY_CLI) {
        const cliOptions = meta.options as CliDecoratorOptions;
        const commandString = cliOptions.command;
        const parts = commandString.split(' ');
        const parentName = parts[0];

        if (!groups.has(parentName)) {
          groups.set(parentName, { subMetas: [] });
        }
        const group = groups.get(parentName)!;

        if (parts.length === 1) {
          // This is the base command itself
          group.baseMeta = meta;
        } else {
          // This is a subcommand
          group.subMetas.push(meta);
        }
      }
    });
    return groups;
  }

  // New/Refactored helper method for executing the command's actual logic
  private async executeCommandLogic(meta: HandlerMetadata, argv: any, rawInput?: string): Promise<void> {
    try {
      const result = await this.executeHandler(meta, argv, rawInput);
      if (result !== undefined) {
        const outputString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        // Ensure newline, important for CLI tools
        process.stdout.write(outputString + (outputString.endsWith('\n') ? '' : '\n'));
      }
    } catch (error) {
      // Re-throw the error. Yargs .fail() handler or the catch block around y.parseAsync()
      // will handle logging and process.exit(1) for non-interactive mode.
      throw error;
    }
  }

  private async handleInput(input: string): Promise<void> {
    const y = yargs(); // Initialize an empty yargs instance
    const args = input.split(' '); // Prepare args separately

    // --- Customizations Start ---
    const cliPackageName = process.env.npm_package_name || '@arifwidianto/dawai-cli'; // Fallback
    const scriptName = cliPackageName.startsWith('@arifwidianto/') ? cliPackageName.substring('@arifwidianto/'.length) : cliPackageName;

    y.scriptName(scriptName === 'dawai-cli' ? 'dawai' : scriptName); // Use 'dawai' if it's dawai-cli

    // For simplicity here, we'll hardcode a title, but ideally, this would be passed in or dynamically fetched
    // if StdioTransportAdapter was more generic. Since it's closely tied to dawai-cli, we can infer.
    this.appTitle = `dawai CLI`; // TODO: add stdio transport options to allow setting app title

    y.usage(`\n${chalk.bold(this.appTitle)} ${chalk.italic(this.frameworkName)}\n\nUsage: $0 <command> [options]`);
    
    // Prevent yargs from exiting the process, especially in interactive mode after showing help
    y.exitProcess(false); 
    // --- Customizations End ---

    const groupedCommands = this.groupCommands();

    groupedCommands.forEach((group, parentCommandName) => {
      const baseHandlerMeta = group.baseMeta;
      const baseCliOptions = baseHandlerMeta?.options as CliDecoratorOptions | undefined;

      const originalBaseDescription = baseCliOptions?.description || `Base command for ${parentCommandName}. Use a subcommand or --help.`;
      const capitalizedParentCommandName = parentCommandName.charAt(0).toUpperCase() + parentCommandName.slice(1);

      y.command(
        parentCommandName,
        originalBaseDescription, // Use original description here, header will be in builder's usage
        (yargsParentInstance: YargsArgvType) => {
          // --- Inject header for command-specific help ---
          let commandSpecificUsage = `\n${chalk.bold(this.appTitle)} ${chalk.italic(this.frameworkName)}\n\n${chalk.bold(capitalizedParentCommandName)}`;
          // For subcommands, we might want a breadcrumb like "Generate > Handler"
          // This part needs to be context-aware if we are deep inside a subcommand's help.
          // For now, this targets the base command's help screen (e.g., `dawai generate --help`).
          
          commandSpecificUsage += `\n${originalBaseDescription}`;
          yargsParentInstance.usage(commandSpecificUsage);
          // --- End header injection ---

          group.subMetas.forEach(subMeta => {
            const subCliOptions = subMeta.options as CliDecoratorOptions;
            const commandParts = subCliOptions.command.split(' ');
            const subCommandName = commandParts.slice(1).join(' ');
            const originalSubDescription = subCliOptions.description || `Sub-command ${subCommandName}`;
            const subCommandPath = commandParts.join(' > '); // e.g., "generate > handler"
            const capitalizedSubCommandPath = subCommandPath.split(' > ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' > ');


            yargsParentInstance.command(
              subCommandName,
              originalSubDescription, // Use original description, header will be in its builder's usage
              (yargsSubInstance: YargsArgvType) => {
                // --- Inject header for subcommand-specific help ---
                let subCommandSpecificUsage = `\n${chalk.bold(this.appTitle)} ${chalk.italic(this.frameworkName)}\n\n${chalk.bold(capitalizedSubCommandPath)}`;
                subCommandSpecificUsage += `\n${originalSubDescription}`; // Subcommands usually show options directly
                yargsSubInstance.usage(subCommandSpecificUsage);
                // --- End header injection ---

                const schema = subCliOptions.schema;
                // --- DEBUGGING START ---
                // console.log(`[DEBUG] Subcommand: ${subCommandName}`);
                // console.log(`[DEBUG] Schema constructor name: ${schema?.constructor.name}`);
                // if (schema && 'shape' in schema) {
                //   console.log(`[DEBUG] Schema keys: ${Object.keys((schema as any).shape || {})}`);
                // } else {
                //   console.log(`[DEBUG] Schema has no shape or is undefined.`);
                // }
                // --- DEBUGGING END ---

                let objectSchema: ZodObject<any, any, any> | undefined = undefined;
                if (schema instanceof ZodObject) {
                  objectSchema = schema;
                } else if (schema && typeof (schema as any).innerType === 'function') {
                  // Attempt to get the inner schema, common for ZodEffects, ZodOptional, etc.
                  const inner = (schema as any).innerType();
                  if (inner instanceof ZodObject) {
                    objectSchema = inner;
                  }
                }
                
                if (objectSchema) {
                  const shape = objectSchema.shape as Record<string, ZodTypeAny>;
                  // --- MORE DEBUGGING ---
                  // if (subCommandName === 'monorepo') {
                  //   console.log(`[DEBUG MONOREPO] Processing schema for monorepo. Keys: ${Object.keys(shape)}`);
                  // }
                  // --- MORE DEBUGGING END ---
                  Object.keys(shape).forEach(key => {
                    const zodType = shape[key];
                    const isRequired = !zodType.isOptional(); // Check if the Zod type is optional

                    const optionConfig: any = {
                      description: zodType.description || `Option for ${key}`,
                      // Yargs infers type based on what's passed or if .string(), .boolean() etc. is used.
                      // For now, we let yargs infer or treat as string by default.
                      // We could try to map Zod types to yargs types (string, boolean, number, array, count)
                      // but that adds complexity. Zod validation will catch type errors anyway.
                    };

                    if (isRequired) {
                      optionConfig.demandOption = true;
                    }

                    // Map Zod types to yargs option types
                    let actualType = zodType;
                    // Unwrap ZodOptional and ZodDefault iteratively to get the underlying base type
                    while (actualType instanceof ZodOptional || actualType instanceof ZodDefault) {
                      actualType = actualType._def.innerType;
                    }
                    
                    if (actualType instanceof ZodBoolean) {
                      optionConfig.type = 'boolean';
                    } else if (actualType instanceof ZodNumber) {
                      optionConfig.type = 'number';
                    } else if (actualType instanceof ZodArray) {
                      optionConfig.type = 'array';
                    } else if (actualType instanceof ZodString || actualType instanceof ZodEnum) { // Treat ZodEnum as string for yargs
                      optionConfig.type = 'string';
                    }
                    // Default is often string, or yargs infers. Explicitly setting helps.

                    yargsSubInstance.option(key, optionConfig);
                  });
                }
                yargsSubInstance.strict(); // Apply strict mode to the subcommand instance itself
                return yargsSubInstance;
              },
              async (argv) => {
                await this.executeCommandLogic(subMeta, argv, input);
              }
            );
          });

          if (group.subMetas.length > 0 && !baseHandlerMeta) {
            yargsParentInstance.demandCommand(1, `Please specify a subcommand for ${parentCommandName}.`);
          }

          return yargsParentInstance;
        },
        baseHandlerMeta
          ? async (argv) => { await this.executeCommandLogic(baseHandlerMeta, argv, input); }
          : undefined
      );
    });

    y.demandCommand(1, 'Please specify a command or type --help for a list of commands.')
      .recommendCommands()
      .strict() // For commands
      .strictOptions() // For options
      .help()
      .alias('h', 'help')
      .fail((msg, err, yargsInstance) => {
        const errorMessage = err ? err.message : msg;
        if (errorMessage) {
          if (this.options?.interactive) {
            if (err) console.error(chalk.red('Error:'), chalk.red(errorMessage));
            else if (msg) console.log(chalk.yellow(msg)); // Yargs messages like "Unknown argument"
          } else {
            // For non-interactive, errors should go to stderr
            console.error(chalk.red(errorMessage));
          }
        }
        // To stop execution and prevent the command handler from running, throw an error.
        // This will be caught by the try/catch around y.parseAsync().
        if (err) throw err; // Re-throw the original error if it exists
        if (msg) throw new Error(msg); // Create a new error from the message
        throw new Error('CLI command failed due to an unspecified error.'); // Fallback error
      });

    try {
      await y.parseAsync(args); // Pass args to parseAsync
    } catch (e: any) {
      // This catch handles errors re-thrown from executeCommandLogic, Zod validation errors,
      // or errors thrown by our custom .fail() handler (e.g., unknown argument).
      
      // Check if it's a ZodError and print its issues
      if (e.name === 'ZodError') {
        const zodError = e as import('zod').ZodError;
        console.error(chalk.red('Input validation failed:'));
        zodError.errors.forEach(err => {
          console.error(chalk.red(`  - ${err.path.join('.') || 'error'}: ${err.message}`));
        });
      } else if (this.options?.interactive && e.message) {
        // For other errors in interactive mode, if not already handled by yargs.fail
        // (yargs.fail re-throws, so it could be caught here)
        // console.error(chalk.red('Error:'), chalk.red(e.message));
        // yargs.fail already logs, so this might be redundant unless it's an error from executeCommandLogic
      } else if (!this.options?.interactive && e.message) {
        // For non-interactive, ensure error message is printed if not done by yargs.fail
        // console.error(chalk.red(e.message)); 
        // yargs.fail already logs to stderr for non-interactive
      }
      // If the error was not a ZodError and yargs.fail already logged it, we don't need to log again.
      // The primary purpose here is to ensure ZodErrors are clearly reported.

      if (!this.options?.interactive) {
        if (process.exitCode === undefined || process.exitCode === 0) {
          process.exitCode = 1;
        }
      }
    } finally {
      // In non-interactive mode, if an error occurred (exitCode is set), ensure the process exits.
      if (!this.options?.interactive && process.exitCode !== undefined && process.exitCode !== 0) {
        process.exit(process.exitCode);
      }
    }
  }

  protected async executeHandler(
    handlerMetadata: HandlerMetadata,
    argv: any, // Parsed args from yargs
    rawInput?: string // Raw input string for context
  ): Promise<any> {
    const { handlerFn, parameters, serviceInstance } = handlerMetadata;
    const cliOptions = handlerMetadata.options as CliDecoratorOptions;
    const zodSchema = cliOptions.schema as ZodSchema | undefined;
    const args: any[] = [];

    let validatedInput = argv; // Start with yargs output
    // Remove yargs specific properties ($0, _) before Zod validation
    const dataToValidate = { ...argv };
    delete dataToValidate._;
    delete dataToValidate.$0;

    if (zodSchema) {
      const validationResult = zodSchema.safeParse(dataToValidate);
      if (!validationResult.success) {
        throw validationResult.error; // This will be caught by handleInput's catch block
      }
      validatedInput = validationResult.data; // Use Zod's parsed (and potentially transformed) data
    }

    for (const paramMeta of parameters) {
      switch (paramMeta.type) {
        case ParameterType.BODY:
          // For @Body(), inject the entire validated arguments object
          args[paramMeta.index] = validatedInput;
          break;
        // ParameterType.PARAMS is not typically used for CLI in the same way as URL params.
        // If specific named arguments are needed, they'd come from `validatedInput[paramMeta.key]`.
        // For now, @Body() is the primary way to get CLI args.
        // If @Arg(name) decorator is introduced, it would use ParameterType.PARAMS with a key.
        case ParameterType.CTX:
          const context: StdioContext = {
            rawInput: rawInput || this.rawCliInputString, // Use current command's raw input if available
            argv, // Original yargs output
            validatedArgs: validatedInput, // Zod validated output
            stdout: process.stdout,
            stdin: process.stdin,
            adapter: this,
            handlerMetadata
          };
          args[paramMeta.index] = context;
          break;
        default:
          args[paramMeta.index] = undefined;
      }
    }

    return handlerFn.apply(serviceInstance, args);
  }
}
