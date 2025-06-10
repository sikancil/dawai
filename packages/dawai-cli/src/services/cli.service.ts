import { Cli, Ctx, Body } from '@arifwidianto/dawai-common'; // Updated imports, removed Files
import { StdioContext } from '@arifwidianto/dawai-stdio'; // Added StdioContext import
import chalk from 'chalk';
import {
  generateHandlerSchema,
  GenerateHandlerOptions,
  generateServiceSchema,
  GenerateServiceOptions,
  generateAppSchema,
  GenerateAppOptions,
  generateMonorepoSchema,
  GenerateMonorepoOptions,
  executeGenerateHandlerCommand,
  executeGenerateServiceCommand,
  executeGenerateAppCommand,
  executeGenerateMonorepoCommand,
} from './cli'; // Imports from packages/dawai-cli/src/services/cli/index.ts

// The DawaiCliService class itself remains, but its methods will be leaner.
export class DawaiCliService {
  @Cli({
    command: 'generate',
    description: `Base command for various generation tasks. Use a subcommand like handler, app, service, or monorepo.`
  })
  async generateBaseCmd(@Ctx() ctx: StdioContext): Promise<void> {
    // This method is primarily for providing the description for `dawai generate --help`.
    // Yargs will automatically show subcommands. If `dawai generate` is run without subcommands,
    // yargs' `demandCommand()` in StdioTransportAdapter will prompt for a subcommand.
    // So, this handler might not even be called if a subcommand is not provided,
    // but its description is used by yargs.
    // If it IS called (e.g. if demandCommand was not strict), we can show help.
    // For now, let's assume yargs handles the "no subcommand" case.
    // If you want `dawai generate` itself to print something specific, do it here.
    // Example: ctx.stdout.write("Please specify a subcommand for generate. Use --help for options.\n");
  }

  @Cli({
    command: 'generate handler',
    description: 'Generates a new handler boilerplate file.',
    schema: generateHandlerSchema
  })
  async generateHandlerCmd(
    @Body() options: GenerateHandlerOptions,
    @Ctx() ctx: StdioContext
  ) {
    const result = await executeGenerateHandlerCommand(options, ctx);
    if (!result.success) {
      // The executeGenerateHandlerCommand already prints to stdout via ctx
      // Rethrow or handle as an actual error if needed by the CLI framework
      throw new Error(result.message || 'Handler generation failed.');
    }
    return result;
  }

  @Cli({ command: 'hello', description: 'Says hello.' })
  async hello(@Ctx() ctx: StdioContext) {
    ctx.stdout.write(chalk.blue('Hello from Dawai CLI Service!\n'));
    return { message: "Hello successful!" };
  }

  @Cli({
    command: 'generate service',
    description: 'Generates a new boilerplate service class file (e.g., MyExampleService).',
    schema: generateServiceSchema
  })
  async generateServiceCmd(
    @Body() options: GenerateServiceOptions,
    @Ctx() ctx: StdioContext
  ) {
    const result = await executeGenerateServiceCommand(options, ctx);
    if (result && 'error' in result && result.error) {
      throw new Error(result.message || 'Service generation failed.');
    }
    return result;
  }

  @Cli({
    command: 'generate app',
    description: 'Generates a new minimal Dawai microservice application structure.',
    schema: generateAppSchema
  })
  async generateAppCmd(
    @Body() options: GenerateAppOptions,
    @Ctx() ctx: StdioContext
  ) {
    // Pass options and the specific file payload to the logic function
    const result = await executeGenerateAppCommand(options, ctx);
    if (result && 'error' in result && result.error) {
      throw new Error(result.message || 'App generation failed.');
    }
    return result;
  }

  @Cli({
    command: 'generate monorepo',
    description: 'Generates a new monorepo with multiple Dawai microservices and shared packages.',
    schema: generateMonorepoSchema
  })
  async generateMonorepoCmd(
    @Body() options: GenerateMonorepoOptions,
    @Ctx() ctx: StdioContext
  ) {
    const result = await executeGenerateMonorepoCommand(options, ctx);
    if (result && 'error' in result && result.error) {
      throw new Error(result.message || 'Monorepo generation failed.');
    }
    return result;
  }
}
