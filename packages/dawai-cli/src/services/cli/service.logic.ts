// import { Ctx } from '@arifwidianto/dawai-microservice'; // Not needed if ctx is 'any'
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { GenerateServiceOptions } from './schemas';

export async function executeGenerateServiceCommand(
  options: GenerateServiceOptions,
  ctx: any // Changed Ctx type to any
): Promise<{ message: string, serviceName: string, path: string } | { message: string, error: true }> {
  const { serviceName, path: customPath } = options;

  const generatedCode = `
// Example imports (uncomment and adjust as needed):
// import { Body, Ctx, Cli, Crud, Mcp, Ws, Rpc, A2a, Sse, Llm, Stdio, Webservice, TransportType } from '@arifwidianto/dawai-common';
// import { StdioContext } from '@arifwidianto/dawai-stdio';
// import { WebServiceContext } from '@arifwidianto/dawai-webservice';
// import { z } from 'zod';

// Example: Define a simple schema for a handler if you add one
// const exampleSchema = z.object({
//   name: z.string(),
// });

export class ${serviceName} {
  constructor() {
    // console.log('${serviceName} instantiated');
  }

  // TODO: Add your handler methods here.
  // Each method can be decorated with transport decorators like @Cli, @Crud, @Ws, etc. from '@arifwidianto/dawai-common'.
  // Remember to include the 'transportType' option in your decorators.
  // Example handler:
  // @Cli({ command: '${serviceName.toLowerCase()}_example', schema: exampleSchema, transportType: TransportType.STDIO })
  // async exampleHandler(@Body() body: z.infer<typeof exampleSchema>, @Ctx() ctx: StdioContext) {
  //   ctx.stdout.write(\`Received name: \${body.name} in ${serviceName}\\n\`);
  //   return { message: \`Hello \${body.name} from ${serviceName}!\` };
  // }

  /**
   * Optional lifecycle hook, called after the service and its transport adapters are initialized.
   */
  async onModuleInit() {
    // console.log('${serviceName} has been initialized.');
  }

  /**
   * Optional lifecycle hook, called before the application shuts down.
   */
  async onApplicationShutdown() {
    // console.log('${serviceName} is shutting down.');
  }
}
`;

  // Determine the base directory for the service file
  // If a custom path is provided, use it. Otherwise, default to 'src/services' in the current working directory.
  const baseDir = customPath ? path.resolve(customPath) : path.resolve(process.cwd(), 'src', 'services');
  const targetFileName = `${serviceName}.service.ts`;
  const targetFilePath = path.join(baseDir, targetFileName);

  try {
    await fs.ensureDir(baseDir); // Ensure the base directory exists
    await fs.writeFile(targetFilePath, generatedCode);

    ctx.stdout.write(chalk.green(`Successfully generated service file at: ${targetFilePath}\n`));
    return {
      message: `Service ${serviceName} generated successfully.`,
      serviceName: serviceName,
      path: targetFilePath
    };
  } catch (error: any) {
    const errorMessage = `Error writing service file ${targetFilePath}: ${error.message}`;
    ctx.stdout.write(chalk.red(`${errorMessage}\n`));
    return { message: errorMessage, error: true };
  }
}
