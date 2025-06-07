// packages/dawai-cli/src/services/cli.service.ts
import { z } from 'zod';
import { cli, Body, Ctx } from '@arifwidianto/dawai-microservice';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { toPascalCase, toCamelCase } from '../utils/stringUtils';

// Define Zod schema for the 'generate handler' command arguments
const generateHandlerSchema = z.object({
  handlerName: z.string().min(1, "Handler name cannot be empty.")
    .refine(name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name), {
      message: "Handler name must be a valid JavaScript identifier (alphanumeric, no spaces, can have underscores, not start with a number)."
    }),
  transports: z.string().min(1, "At least one transport must be specified using --transports option.")
    .transform(val => val.split(',').map(t => t.trim().toLowerCase()).filter(t => t)),
}).refine(data => data.transports.length > 0, {
    message: "Transports list cannot be empty after parsing.",
    path: ["transports"],
});

type GenerateHandlerOptions = z.infer<typeof generateHandlerSchema>;

const validTransportsWithOptions: Record<string, (handlerName: string, schemaName: string) => string> = {
  cli: (hn, sn) => `@cli({ command: '${hn}', schema: ${sn} })`,
  crud: (hn, sn) => `@crud({ endpoint: '/${hn.toLowerCase()}', method: 'POST', schema: ${sn} })`,
  ws: (hn, sn) => `@ws({ event: '${hn}', schema: ${sn} })`,
  mcp: (hn, sn) => `@mcp({ command: '${hn}', schema: ${sn} })`,
  a2a: (hn, sn) => `@a2a({ command: '${hn}', schema: ${sn} })`,
  rpc: (hn, sn) => `@rpc({ command: '${hn}', schema: ${sn} })`,
  sse: (hn, sn) => `@sse({ event: '${hn}', schema: ${sn} })`,
  llm: (hn, sn) => `@llm({ tool: '${hn}', schema: ${sn} })`,
};
const transportsNeedingBody = new Set(['cli', 'crud', 'ws', 'mcp', 'a2a', 'rpc', 'llm', 'sse']);

function generateImportsForService(transports: string[]): string {
  let importString = "import { z } from 'zod';\n";
  const dawaiServiceImports = new Set<string>();
  let needsBody = false;

  transports.forEach(t_raw => {
      const t = t_raw.toLowerCase(); // Ensure lowercase for map lookup
      if(validTransportsWithOptions[t]) {
        dawaiServiceImports.add(t);
        if (transportsNeedingBody.has(t)) {
            needsBody = true;
        }
      }
  });
  if (needsBody) {
    dawaiServiceImports.add('Body');
  }

  if (dawaiServiceImports.size > 0) {
    const sortedImports = Array.from(dawaiServiceImports).sort();
    importString += `import { ${sortedImports.join(', ')} } from '@arifwidianto/dawai-microservice';\n`;
  }
  return importString;
}

function generateSchemaForService(handlerNameCamelCase: string, schemaName: string): string {
  return `const ${schemaName} = z.object({
  // TODO: Define your schema for ${handlerNameCamelCase} here
  message: z.string().optional(),
});\n`;
}

function generateHandlerMethodForService(handlerNameCamelCase: string, transports: string[], schemaName: string): string {
  const decorators = transports
    .map(t => {
      const lowerT = t.toLowerCase();
      return validTransportsWithOptions[lowerT] ? `  ${validTransportsWithOptions[lowerT](handlerNameCamelCase, schemaName)}` : null;
    })
    .filter(Boolean)
    .join('\n');

  const needsBodyParam = transports.some(t => transportsNeedingBody.has(t.toLowerCase()));
  const bodyParamString = needsBodyParam ? `@Body() body: z.infer<typeof ${schemaName}>` : '';
  const bodyLogParam = needsBodyParam ? 'body' : "'(no body parameter)'";

  return `
${decorators}
  async ${handlerNameCamelCase}(${bodyParamString}) {
    // TODO: Implement ${handlerNameCamelCase} logic
    console.log('Executing ${handlerNameCamelCase} with body:', ${bodyLogParam});
    return { message: '${handlerNameCamelCase} executed successfully by Dawai CLI Service!' };
  }
`;
}

export class DawaiCliService {
  @cli({
    command: 'generate handler', // StdioTransportAdapter will parse this as "generate" and "handler"
    description: 'Generates a new handler boilerplate file.',
    schema: generateHandlerSchema
  })
  async generateHandlerCmd(
    @Body() options: GenerateHandlerOptions,
    @Ctx() ctx: any
  ) {
    const { handlerName, transports } = options;
    const validTransportsArray = Array.isArray(transports) ? transports : String(transports).split(',').map(t => t.trim().toLowerCase()).filter(t => t);

    const pascalCaseHandlerName = toPascalCase(handlerName);
    const schemaName = `${toCamelCase(handlerName)}Schema`;
    const className = `${pascalCaseHandlerName}Handler`;

    const imports = generateImportsForService(validTransportsArray);
    const schemaCode = generateSchemaForService(handlerName, schemaName);
    const handlerMethodCode = generateHandlerMethodForService(handlerName, validTransportsArray, schemaName);

    const fullGeneratedCode = `${imports}\n${schemaCode}\nexport class ${className} {\n${handlerMethodCode}\n}\n`;

    const targetDir = path.resolve(process.cwd(), 'src', 'generated', 'handlers');
    const targetFileName = `${pascalCaseHandlerName}.handler.ts`;
    const targetFilePath = path.join(targetDir, targetFileName);

    try {
      await fs.ensureDir(targetDir);
      await fs.writeFile(targetFilePath, fullGeneratedCode);
      ctx.stdout.write(chalk.green(`Successfully generated handler at: ${targetFilePath}\n`));
      return { success: true, path: targetFilePath };
    } catch (error: any) {
      ctx.stdout.write(chalk.red(`Error writing handler file ${targetFilePath}: ${error.message}\n`));
      throw new Error(`File writing failed: ${error.message}`);
    }
  }

  @cli({ command: 'hello', description: 'Says hello.'})
  async hello(@Ctx() ctx: any) {
    ctx.stdout.write(chalk.blue('Hello from Dawai CLI Service!\n'));
    return { message: "Hello successful!" };
  }
}
