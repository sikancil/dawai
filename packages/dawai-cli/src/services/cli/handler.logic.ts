import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { TransportType, TextCase } from '@arifwidianto/dawai-common';
import { GenerateHandlerOptions } from './schemas';

// Constants and helpers specific to handler generation
// Updated to use common decorators and include transportType
export const validTransportsWithOptions: Record<string, (handlerName: string, schemaName: string, includeSchema: boolean) => string> = {
  cli: (hn, sn, inclSchema) => {
    const schemaPart = inclSchema ? `, schema: ${sn}` : '';
    return `@Cli({ command: '${hn}'${schemaPart}, transportType: TransportType.STDIO })`;
  },
  ws: (hn, sn, inclSchema) => {
    const schemaPart = inclSchema ? `, schema: ${sn}` : '';
    return `@Ws({ event: '${hn}'${schemaPart}, transportType: TransportType.WEBSERVICE })`;
  },
  mcp: (hn, sn, inclSchema) => {
    const schemaPart = inclSchema ? `, schema: ${sn}` : '';
    return `@Mcp({ command: '${hn}'${schemaPart}, transportType: TransportType.STDIO })`; // Assuming STDIO for CLI generation
  },
  a2a: (hn, sn, inclSchema) => {
    const schemaPart = inclSchema ? `, schema: ${sn}` : '';
    return `@A2a({ command: '${hn}'${schemaPart}, transportType: TransportType.STDIO })`; // Assuming STDIO for CLI generation
  },
  rpc: (hn, sn, inclSchema) => {
    const schemaPart = inclSchema ? `, schema: ${sn}` : '';
    return `@Rpc({ command: '${hn}'${schemaPart}, transportType: TransportType.WEBSERVICE })`;
  },
  sse: (hn, sn, inclSchema) => {
    const schemaPart = inclSchema ? `, schema: ${sn}` : '';
    return `@Sse({ event: '${hn}'${schemaPart}, transportType: TransportType.WEBSERVICE })`;
  },
  llm: (hn, sn, inclSchema) => {
    const schemaPart = inclSchema ? `, schema: ${sn}` : '';
    return `@Llm({ tool: '${hn}'${schemaPart}, transportType: TransportType.STDIO })`; // Assuming STDIO for CLI generation
  },
};

// 'crud' and 'webservice' are handled separately in generateHandlerMethodContent
export const transportsNeedingBody = new Set(['cli', 'crud', 'ws', 'mcp', 'a2a', 'rpc', 'llm', 'sse']); // NOTE: 'webservice' is not included within Class Method decorators scope.

export function generateImportsForService(transports: ReadonlyArray<string>, options: GenerateHandlerOptions): string {
  let importString = "";
  if (options.includeSchema) {
    importString += "import { z } from 'zod';\n";
  }
  const commonDecorators = new Set<string>();
  let needsStdioContext = false;
  let needsWebServiceContext = false;
  let needsBody = false;
  const needsCtx = true; // Assume Ctx is always needed

  commonDecorators.add('TransportType'); // Always import TransportType

  transports.forEach(t_raw => {
    const t = t_raw.toLowerCase();

    // Determine context type needed
    if (t === 'cli' || t === 'mcp' || t === 'a2a' || t === 'llm') {
      needsStdioContext = true;
    } else if (t === 'webservice' || t === 'crud' || t === 'ws' || t === 'sse' || t === 'rpc') {
      needsWebServiceContext = true;
    }

    // Add specific method decorators
    if (t === 'crud' || t === 'webservice') commonDecorators.add('Crud');
    else if (t === 'ws') commonDecorators.add('Ws');
    else if (t === 'sse') commonDecorators.add('Sse');
    else if (t === 'rpc') commonDecorators.add('Rpc');
    else if (t === 'cli') commonDecorators.add('Cli');
    else if (t === 'mcp') commonDecorators.add('Mcp');
    else if (t === 'a2a') commonDecorators.add('A2a');
    else if (t === 'llm') commonDecorators.add('Llm');
    
    if (transportsNeedingBody.has(t) && options.includeSchema) {
      needsBody = true;
    }
  });

  if (needsBody) {
    commonDecorators.add('Body');
  }
  if (needsCtx) {
    commonDecorators.add('Ctx');
  }

  if (commonDecorators.size > 0) {
    const sortedImports = Array.from(commonDecorators).sort();
    importString += `import { ${sortedImports.join(', ')} } from '@arifwidianto/dawai-common';\n`;
  }

  if (needsStdioContext) {
    importString += `import { StdioContext } from '@arifwidianto/dawai-stdio';\n`;
  }
  if (needsWebServiceContext) {
    importString += `import { WebServiceContext } from '@arifwidianto/dawai-webservice';\n`;
  }
  
  return importString;
}

export function generateSchemaCodeForService(handlerNameCamelCase: string, schemaName: string): string {
  return `const ${schemaName} = z.object({
  // TODO: Define your schema for ${handlerNameCamelCase} here
  message: z.string().optional(),
});\n`;
}

export function generateHandlerMethodContent(
  handlerNameCamelCase: string,
  options: GenerateHandlerOptions,
  schemaName: string
): string {
  const decorators: string[] = [];
  let contextType = 'any'; // Default context type

  const hasStdioTransport = options.transports.some(t => ['cli', 'mcp', 'a2a', 'llm'].includes(t.toLowerCase()));
  const hasWebTransport = options.transports.some(t => ['webservice', 'crud', 'ws', 'sse', 'rpc'].includes(t.toLowerCase()));

  if (hasStdioTransport && hasWebTransport) {
    contextType = 'StdioContext | WebServiceContext';
  } else if (hasStdioTransport) {
    contextType = 'StdioContext';
  } else if (hasWebTransport) {
    contextType = 'WebServiceContext';
  }

  options.transports.forEach(transport => {
    const lowerT = transport.toLowerCase();
    let decoratorString = '';

    if (lowerT === 'webservice') { // Generic HTTP, use @Crud
      const method = options.webserviceMethods || 'get';
      const pathVal = options.path || `/${handlerNameCamelCase.toLowerCase()}`;
      const schemaPart = options.includeSchema ? `, schema: ${schemaName}` : '';
      decoratorString = `  @Crud({ path: '${pathVal}', method: '${method.toUpperCase()}'${schemaPart}, transportType: TransportType.WEBSERVICE })`;
    } else if (lowerT === 'crud') { // Specific CRUD
      const method = options.crudMethods || 'post'; 
      const pathVal = options.path || `/${handlerNameCamelCase.toLowerCase()}`;
      const schemaPart = options.includeSchema ? `, schema: ${schemaName}` : '';
      decoratorString = `  @Crud({ path: '${pathVal}', method: '${method.toUpperCase()}'${schemaPart}, transportType: TransportType.WEBSERVICE })`;
    } else if (validTransportsWithOptions[lowerT]) { // Other specific decorators like @Cli, @Ws etc.
      decoratorString = `  ${validTransportsWithOptions[lowerT](handlerNameCamelCase, schemaName, options.includeSchema!)}`;
    }

    if (decoratorString) {
      decorators.push(decoratorString);
    }
  });

  const needsBodyParam = options.transports.some(t => transportsNeedingBody.has(t.toLowerCase()));
  const bodyParamString = needsBodyParam && options.includeSchema ? `@Body() body: z.infer<typeof ${schemaName}>, ` : '';
  const ctxParamString = `@Ctx() ctx: ${contextType}`;
  const bodyLogParam = needsBodyParam && options.includeSchema ? 'body' : "'(no body parameter)'";

  return `
${decorators.join('\n')}
  async ${handlerNameCamelCase}(${bodyParamString}${ctxParamString}) {
    // TODO: Implement ${handlerNameCamelCase} logic
    console.log('Executing ${handlerNameCamelCase} with body:', ${bodyLogParam}, 'and context:', ctx);
    return { message: '${handlerNameCamelCase} executed successfully by Dawai CLI Service!' };
  }
`;
}

export async function executeGenerateHandlerCommand(
  options: GenerateHandlerOptions,
  ctx: any 
): Promise<{ success: boolean, path?: string, message?: string }> {
  const { handlerName, transports, includeSchema, methodName } = options;

  const effectiveMethodName = methodName || handlerName;
  const camelCaseEffectiveMethodName = TextCase.camelCase(effectiveMethodName);

  const pascalCaseHandlerName = TextCase.pascalCase(handlerName); 
  const className = `${pascalCaseHandlerName}Handler`;
  
  const schemaName = `${camelCaseEffectiveMethodName}Schema`;

  const imports = generateImportsForService(transports, options);
  const schemaCode = includeSchema ? generateSchemaCodeForService(camelCaseEffectiveMethodName, schemaName) : '';
  const handlerMethodCode = generateHandlerMethodContent(camelCaseEffectiveMethodName, options, schemaName);

  const fullGeneratedCode = `${imports}\n${schemaCode}\nexport class ${className} {\n${handlerMethodCode}\n}\n`;

  let targetDir;
  if (options.serviceName) {
    const serviceNamePascal = TextCase.pascalCase(options.serviceName);
    const serviceRootDir = path.resolve(process.cwd(), 'src', 'services', serviceNamePascal);
    const serviceFilePath = path.join(serviceRootDir, `${serviceNamePascal}.service.ts`);

    try {
      await fs.access(serviceFilePath);
    } catch (e) {
      const errorMessage = `Error: Service "${serviceNamePascal}" does not exist or its main file is not accessible at ${serviceFilePath}. Please create the service first.`;
      ctx.stdout.write(chalk.red(`${errorMessage}\n`));
      return { success: false, message: errorMessage };
    }
    targetDir = path.join(serviceRootDir, 'handlers');
  } else {
    targetDir = path.resolve(process.cwd(), 'src', 'generated', 'handlers');
  }

  const targetFileName = `${pascalCaseHandlerName}.handler.ts`;
  const targetFilePath = path.join(targetDir, targetFileName);

  try {
    await fs.ensureDir(targetDir);
    await fs.writeFile(targetFilePath, fullGeneratedCode);
    ctx.stdout.write(chalk.green(`Successfully generated handler at: ${targetFilePath}\n`));
    return { success: true, path: targetFilePath };
  } catch (error: any) {
    const errorMessage = `Error writing handler file ${targetFilePath}: ${error.message}`;
    ctx.stdout.write(chalk.red(`${errorMessage}\n`));
    return { success: false, message: errorMessage };
  }
}
