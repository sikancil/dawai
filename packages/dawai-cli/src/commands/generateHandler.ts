import { toPascalCase, toCamelCase } from '../utils/stringUtils';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk'; // For logging success/error within this module

export interface GenerateHandlerOptions {
  handlerName: string; // camelCase from input
  transports: string[];
}

// schemaName is the variable name for the Zod schema object
const validTransportsWithOptions: Record<string, (handlerNameCamelCase: string, schemaName: string) => string> = {
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

// Internal helper functions (previously part of generateHandlerCode or separate)
function generateImports(transports: string[]): string {
  let needsBody = false;
  const dawaiImportNames = new Set<string>();

  transports.forEach(tRaw => {
    const t = tRaw.toLowerCase();
    if (validTransportsWithOptions[t]) {
      dawaiImportNames.add(t);
      if (transportsNeedingBody.has(t)) {
        needsBody = true;
      }
    }
  });

  if (needsBody) {
    dawaiImportNames.add('Body');
  }

  let importString = "import { z } from 'zod';\n";
  if (dawaiImportNames.size > 0) {
    const sortedImports = Array.from(dawaiImportNames).sort();
    importString += `import { ${sortedImports.join(', ')} } from '@arifwidianto/dawai-microservice';\n`;
  }
  return importString;
}

function generateSchema(handlerNameCamelCase: string, schemaName: string): string {
  return `const ${schemaName} = z.object({
  // TODO: Define your schema for ${handlerNameCamelCase} here
  message: z.string().optional(), // Example field
});\n`;
}

function generateHandlerMethod(handlerNameCamelCase: string, transports: string[], schemaName: string): string {
  const decorators = transports
    .map(t => t.toLowerCase())
    .filter(t => validTransportsWithOptions[t])
    .map(t => `  ${validTransportsWithOptions[t](handlerNameCamelCase, schemaName)}`)
    .join('\n');

  const needsBodyParam = transports.some(t => transportsNeedingBody.has(t.toLowerCase()));
  const bodyParamString = needsBodyParam ? `@Body() body: z.infer<typeof ${schemaName}>` : '';
  const bodyUsage = needsBodyParam ? 'body' : '{}';

  return `
${decorators}
  async ${handlerNameCamelCase}(${bodyParamString}) {
    // TODO: Implement ${handlerNameCamelCase} logic
    console.log('Executing ${handlerNameCamelCase} with body:', ${bodyUsage});
    return { message: '${handlerNameCamelCase} executed successfully' };
  }
`;
}

// Main exported function for this command
export async function handleGenerateHandlerCommand(options: GenerateHandlerOptions): Promise<void> {
  const { handlerName, transports } = options; // handlerName is camelCase from input

  const pascalCaseHandlerName = toPascalCase(handlerName);
  const className = `${pascalCaseHandlerName}Handler`;
  const schemaName = `${toCamelCase(handlerName)}Schema`;

  const imports = generateImports(transports);
  const schemaCode = generateSchema(handlerName, schemaName);
  const handlerMethodCode = generateHandlerMethod(handlerName, transports, schemaName);

  const fullGeneratedCode = `${imports}
${schemaCode}
export class ${className} {
${handlerMethodCode}
}
`;

  // Default to src/generated in the current working directory
  // Users might want to configure this path later.
  const targetDir = path.resolve(process.cwd(), 'src', 'generated', 'handlers'); // More specific subdirectory
  const targetFileName = `${pascalCaseHandlerName}.handler.ts`; // e.g., MyAction.handler.ts
  const targetFilePath = path.join(targetDir, targetFileName);

  try {
    await fs.ensureDir(targetDir); // Create directory if it doesn't exist
    await fs.writeFile(targetFilePath, fullGeneratedCode);
    console.log(chalk.green(`Successfully generated handler at: ${targetFilePath}`));
  } catch (error: any) {
    console.error(chalk.red(`Error writing handler file to ${targetFilePath}:`), error.message);
    throw error; // Propagate error to be handled by the main CLI index.ts
  }
}
