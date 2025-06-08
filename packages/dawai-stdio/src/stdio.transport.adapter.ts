import { TransportAdapter, StdioOptions, metadataStorage, DawaiMiddleware, MiddlewareType } from '@arifwidianto/dawai-microservice';
import { ParameterType } from '@arifwidianto/dawai-common';
import * as readline from 'readline';
import { ZodError, ZodSchema, ZodObject, ZodTypeAny } from 'zod';

interface CliCommandDetails {
  methodName: string;
  handlerFn: Function;
  serviceInstance: any;
  commandOptions: any; // From @cli decorator (contains schema, description, etc.)
  paramMetadatas?: any[];
}

export class StdioTransportAdapter extends TransportAdapter {
  public static readonly configKey = 'stdio';

  private rl?: readline.Interface;
  private adapterOptions!: StdioOptions['options'];
  private cliCommands: Map<string, CliCommandDetails> = new Map();

  constructor() {
    super();
  }

  async initialize(config: StdioOptions): Promise<void> {
    if (config.enabled === false) {
      // console.log('StdioTransportAdapter is disabled by configuration. Skipping initialization.');
      return;
    }
    this.adapterOptions = config.options || { interactive: false };
  }

  private _parseCliArgs(cliArgs: string[]): { parsedArgs: Record<string, any>, positionalArgs: string[], helpRequested: boolean } {
    const parsedArgs: Record<string, any> = {};
    const positionalArgs: string[] = [];
    let helpRequested = false;

    for (const arg of cliArgs) {
      if (arg === '--help') {
        helpRequested = true;
      }
      if (arg.startsWith('--')) {
        const [rawKey, ...valueParts] = arg.substring(2).split('=');
        const value = valueParts.join('=');
        let finalValue: any;

        if (value === 'true' || (rawKey === value && valueParts.length === 0)) finalValue = true;
        else if (value === 'false') finalValue = false;
        else if (value && !isNaN(Number(value)) && value.trim() !== '' && value.trim() !== '.') finalValue = Number(value);
        else finalValue = valueParts.length > 0 ? value : true;


        if (parsedArgs.hasOwnProperty(rawKey)) {
          if (!Array.isArray(parsedArgs[rawKey])) {
            parsedArgs[rawKey] = [parsedArgs[rawKey]];
          }
          parsedArgs[rawKey].push(finalValue);
        } else {
          parsedArgs[rawKey] = finalValue;
        }
      } else {
        positionalArgs.push(arg);
      }
    }
    if (parsedArgs['help'] === true) helpRequested = true;

    return { parsedArgs, positionalArgs, helpRequested };
  }

  private _generateCommandHelp(commandName: string, commandDetail: CliCommandDetails): string {
    let helpText = `Usage: ${commandName} [options]\n\n`;
    if (commandDetail.commandOptions.description) {
      helpText += `${commandDetail.commandOptions.description}\n\n`;
    }
    helpText += 'Options:\n';

    if (commandDetail.commandOptions.schema && commandDetail.commandOptions.schema instanceof ZodObject) {
      const shape = (commandDetail.commandOptions.schema as ZodObject<any>).shape;
      for (const key in shape) {
        const fieldSchema = shape[key] as ZodTypeAny;
        let typeDescription = fieldSchema.description || '';
        if (!typeDescription) {
            if (fieldSchema._def.typeName === 'ZodString') typeDescription = 'string';
            else if (fieldSchema._def.typeName === 'ZodNumber') typeDescription = 'number';
            else if (fieldSchema._def.typeName === 'ZodBoolean') typeDescription = 'boolean';
            else if (fieldSchema._def.typeName === 'ZodArray') typeDescription = 'array';
            else if (fieldSchema._def.typeName === 'ZodObject') typeDescription = 'object';
            else typeDescription = fieldSchema._def.typeName;
        }
        helpText += `  --${key}${typeDescription ? ` <${typeDescription}>` : ''}\n`;
      }
    } else {
      helpText += '  No specific options defined in schema.\n';
    }
    helpText += '  --help       Display this help message\n';
    return helpText;
  }

  private _printGeneralHelp() {
    console.log('Available commands:');
    this.cliCommands.forEach((details, cmd) => {
      console.log(`  ${cmd.padEnd(15)}${details.commandOptions?.description || ''}`);
    });
    console.log(`  ${'help <command>'.padEnd(15)}Display help for a specific command.`);
    console.log(`  ${'exit|quit'.padEnd(15)}Exit interactive mode.`);
  }


  private async _executeCommand(
    commandName: string,
    commandArgs: string[],
    commandDetail: CliCommandDetails
  ): Promise<{ success: boolean, result?: any, error?: any }> {
    try {
      const { serviceInstance, handlerFn, commandOptions: cliOptions, paramMetadatas, methodName: cmdMethodName } = commandDetail;
      const methodMetadata = metadataStorage.getMethodMetadata(serviceInstance.constructor, cmdMethodName);
      const middlewareTypes: MiddlewareType[] | undefined = methodMetadata?.useMiddleware;
      const { parsedArgs, positionalArgs } = this._parseCliArgs(commandArgs);
      let inputDataForValidation: any = parsedArgs;

      if (cliOptions.schema) {
        const validationResult = (cliOptions.schema as ZodSchema<any>).safeParse(inputDataForValidation);
        if (!validationResult.success) {
          console.error(`Invalid arguments for command '${commandName}':`);
          const fieldErrors = validationResult.error.flatten().fieldErrors;
          for (const field in fieldErrors) {
            console.error(`  ${field}: ${(fieldErrors[field] as string[]).join(', ')}`);
          }
          console.error("\n" + this._generateCommandHelp(commandName, commandDetail));
          return { success: false, error: validationResult.error };
        }
        inputDataForValidation = validationResult.data;
      }

      const executeOriginalCliHandler = async () => {
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
                  handlerArgs[paramMeta.index] = inputDataForValidation;
                }
                break;
              case ParameterType.CTX:
                handlerArgs[paramMeta.index] = {
                  command: commandName,
                  rawArgs: commandArgs,
                  parsedArgs: inputDataForValidation,
                  positionalArgs,
                  stdout: process.stdout,
                  stdin: process.stdin,
                  clearLine: () => {
                    if (process.stdout.isTTY) {
                      process.stdout.clearLine(0);
                      process.stdout.cursorTo(0);
                    }
                  },
                  writeOverwritable: (message: string) => {
                    if (process.stdout.isTTY) {
                      process.stdout.clearLine(0);
                      process.stdout.cursorTo(0);
                      process.stdout.write(message);
                    } else {
                      process.stdout.write(message + '\n');
                    }
                  }
                };
                break;
              default:
                handlerArgs[paramMeta.index] = undefined;
            }
          }
        }
        return await handlerFn(...handlerArgs);
      };

      let result: any;
      if (middlewareTypes && middlewareTypes.length > 0) {
        const middlewares = middlewareTypes.map(mw => (typeof mw === 'function' && mw.prototype?.use) ? new (mw as any)() : mw).filter(mw => typeof mw.use === 'function');
        const cliContext = { command: commandName, rawArgs: commandArgs, parsedArgs, positionalArgs, serviceInstance };
        let chain = executeOriginalCliHandler;
        for (let i = middlewares.length - 1; i >= 0; i--) {
          const currentMiddleware = middlewares[i];
          const nextInChain = chain;
          chain = async () => currentMiddleware.use(cliContext, nextInChain);
        }
        result = await chain();
      } else {
        result = await executeOriginalCliHandler();
      }
      return { success: true, result };
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error instanceof Error ? error.message : String(error));
      return { success: false, error };
    }
  }

  async listen(): Promise<void> {
    const isInteractiveOption = this.adapterOptions?.interactive === true;
    const isTty = process.stdin.isTTY;
    const procArgs = process.argv.slice(2);
    const hasProcessCmd = procArgs.length > 0;

    if (isInteractiveOption && isTty) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: this.adapterOptions?.prompt || 'DAWAI_CLI> '
      });
      console.log(`StdioTransportAdapter: Interactive mode. Type 'help' for commands, 'exit' to quit.`);
      this.rl.prompt();

      this.rl.on('line', async (line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          const [commandName, ...commandArgs] = trimmedLine.split(/\s+/);
          if (commandName === 'exit' || commandName === 'quit') {
            this.rl?.close(); return;
          }
          if (commandName === 'help') {
            if (commandArgs.length > 0) {
              const helpCmdName = commandArgs[0];
              const commandDetail = this.cliCommands.get(helpCmdName);
              if (commandDetail) {
                console.log(this._generateCommandHelp(helpCmdName, commandDetail));
              } else {
                console.log(`Unknown command for help: ${helpCmdName}`);
              }
            } else {
              this._printGeneralHelp();
            }
            this.rl?.prompt(); return;
          }

          const commandDetail = this.cliCommands.get(commandName);
          if (commandDetail) {
            const { success, result } = await this._executeCommand(commandName, commandArgs, commandDetail);
            if (success && result !== undefined) {
              console.log(JSON.stringify(result, null, 2));
            }
          } else {
            console.log(`Unknown command: ${commandName}. Type 'help' for available commands.`);
          }
        }
        this.rl?.prompt();
      }).on('close', () => {
        console.log('StdioTransportAdapter: Exiting interactive mode.');
        process.exit(0);
      });

    } else if (hasProcessCmd) {
      const commandName = procArgs[0];
      const commandArgs = procArgs.slice(1);
      const { parsedArgs, helpRequested } = this._parseCliArgs(commandArgs);

      if (commandName === 'help' && !helpRequested) {
        const helpCmdName = commandArgs[0];
        if (helpCmdName) {
            const commandDetail = this.cliCommands.get(helpCmdName);
            if (commandDetail) {
                console.log(this._generateCommandHelp(helpCmdName, commandDetail));
            } else {
                console.error(`Error: Command '${helpCmdName}' not found for help.`);
                this._printGeneralHelp();
            }
        } else {
            this._printGeneralHelp();
        }
        process.exit(0);
      }

      const commandDetail = this.cliCommands.get(commandName);
      if (!commandDetail) {
        console.error(`Error: Command '${commandName}' not found.`);
        this._printGeneralHelp();
        process.exit(1);
      }

      if (helpRequested) {
        console.log(this._generateCommandHelp(commandName, commandDetail));
        process.exit(0);
      }

      const { success, result } = await this._executeCommand(commandName, commandArgs, commandDetail);
      if (success) {
        if (result !== undefined) {
          if (typeof result === 'string') console.log(result);
          else console.log(JSON.stringify(result, null, 2));
        }
        process.exit(0);
      } else {
        process.exit(1);
      }

    } else {
      if (isInteractiveOption && !isTty) {
        console.warn("StdioTransportAdapter: Interactive mode configured, but not a TTY.");
        console.warn("For one-shot commands: node <script> <command> [args...]");
      } else {
        console.log("StdioTransportAdapter: No command provided. Use '--interactive' or a command.");
        this._printGeneralHelp();
      }
      process.exit(1);
    }
  }

  async close(): Promise<void> {
    if (this.rl) this.rl.close();
  }

  registerHandler(methodName: string, metadata: any, handlerFn: Function, serviceInstance: any): void {
    if (metadata?.cli) {
      const cliOptions = metadata.cli;
      if (cliOptions.command) {
        const paramMetadatas = metadataStorage.getParameterMetadata(serviceInstance.constructor, methodName);
        this.cliCommands.set(cliOptions.command, {
          methodName,
          handlerFn: handlerFn.bind(serviceInstance),
          serviceInstance,
          commandOptions: cliOptions,
          paramMetadatas
        });
      } else {
        console.warn(`StdioTransportAdapter: CLI command for ${serviceInstance.constructor.name}.${methodName} is missing 'command' option.`);
      }
    }
  }
}
