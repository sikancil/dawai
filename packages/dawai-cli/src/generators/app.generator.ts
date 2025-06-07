// packages/dawai-cli/src/generators/app.generator.ts
import { toPascalCase as anyCaseToPascalCase } from '../utils/stringUtils'; // Renaming for clarity

// This specific version is for kebab-case to PascalCase, useful for appName -> ServiceName
function kebabToPascalCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/-(\w)/g, (_, c) => c.toUpperCase()).replace(/^./, (match) => match.toUpperCase());
}


export function generatePackageJsonContent(appNameKebabCase: string): string {
  return JSON.stringify({
    name: appNameKebabCase,
    version: "0.1.0",
    private: true,
    main: "dist/src/index.js",
    types: "dist/src/index.d.ts",
    scripts: {
      "build": "rimraf dist && tsc -p tsconfig.json",
      "start": "node dist/src/index.js",
      "dev": "tsc-watch --onSuccess \"node dist/src/index.js\"",
      "test": "echo \"Error: no test specified\" && exit 1"
    },
    dependencies: {
      "@arifwidianto/dawai-microservice": "0.1.0",
      "@arifwidianto/dawai-stdio": "0.1.0",
      "@arifwidianto/dawai-http-transport": "0.1.0",
      "zod": "^3.22.0"
    },
    devDependencies: {
      "typescript": "^5.0.0",
      "@types/node": "^18.0.0",
      "rimraf": "^5.0.0",
      "tsc-watch": "^6.0.0"
    },
    engines: { "node": ">=18.0.0" }
  }, null, 2);
}

export function generateTsConfigJsonContent(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "commonjs",
      moduleResolution: "node",
      outDir: "./dist",
      rootDir: "./src",
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      declaration: true,
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"]
  }, null, 2);
}

export function generateGitIgnoreContent(): string {
  return `
node_modules
dist
*.log
.DS_Store
.env
.env.*
!/.env.example
npm-debug.log*
yarn-debug.log*
yarn-error.log*
  `.trim() + '\n';
}

export function generateAppIndexTsContent(defaultServiceNamePascalCase: string, appType: 'single' | 'mcp' | 'a2a'): string {
  const mcpServerConfig = appType === 'mcp' ? `
    mcpServer: {
      enabled: true,
      transport: 'stdio',
      options: {
        name: \`${defaultServiceNamePascalCase} MCP Server\`,
        description: 'A Model Context Protocol server for this application.',
        version: '1.0.0',
      },
    },` : '';

  const a2aAgentConfig = appType === 'a2a' ? `
    a2aAgent: {
      enabled: true,
      transport: 'http', // Default transport for A2A agent
      options: {
        metadata: {
          name: \`${defaultServiceNamePascalCase} A2A Agent\`,
          description: 'An Agent-to-Agent communication endpoint for this application.',
          version: '1.0.0',
          // Developer would add more specific DID/endpoint metadata here
        },
        // Other A2A specific options could be added here
        // Example: endpointUrl: process.env.A2A_ENDPOINT_URL || 'http://localhost:8081/a2a',
      },
    },` : '';

  // Determine stdio interactive mode based on appType
  let stdioInteractive = true;
  if (appType === 'mcp' && mcpServerConfig.includes("transport: 'stdio'")) {
    stdioInteractive = false; // MCP server taking over stdio
  } else if (appType === 'a2a') {
    stdioInteractive = false; // A2A might run as a background agent, CLI for admin
  }


  return `
import { Microservice, MicroserviceOptions, HttpTransportAdapter } from '@arifwidianto/dawai-microservice';
// If HttpTransportAdapter is in its own package:
// import { HttpTransportAdapter } from '@arifwidianto/dawai-http-transport';
import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio';
import { ${defaultServiceNamePascalCase} } from './services/${defaultServiceNamePascalCase}.service';
import 'reflect-metadata'; // Ensure metadata reflection is enabled

async function bootstrap() {
  const microserviceOptions: MicroserviceOptions = {${mcpServerConfig}${a2aAgentConfig}
    webservice: {
      enabled: true,
      options: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
      }
    },
    stdio: {
      enabled: true,
      options: {
        interactive: ${stdioInteractive},
      }
    }
  };

  const app = new Microservice(${defaultServiceNamePascalCase}, microserviceOptions);

  app.registerTransport(new HttpTransportAdapter());
  app.registerTransport(new StdioTransportAdapter());

  try {
    await app.bootstrap();
    await app.listen();
    console.log(\`${defaultServiceNamePascalCase} is running.\`);
    console.log(\`App Type: ${appType.toUpperCase()}\`);
    if (appType === 'single') {
      console.log(\`Try CLI: node dist/src/index.js ping\`);
    } else if (appType === 'mcp') {
      console.log(\`MCP Server mode enabled. Use an MCP client to interact or define specific CLI commands.\`);
    } else if (appType === 'a2a') {
      console.log(\`A2A Agent mode enabled. Ensure your agent configuration and DIDs are set up.\`);
      console.log(\`Consider adding specific CLI commands for A2A admin tasks.\`);
    }
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}

bootstrap();

const signals = ['SIGINT', 'SIGTERM'] as const;
signals.forEach(signal => {
  process.on(signal, async () => {
    console.log(\`\nReceived \${signal}, shutting down gracefully...\`);
    // TODO: Implement app.close() in Microservice class if not already present
    // await app.close();
    process.exit(0);
  });
});
  `.trim() + '\n';
}

export function generateDefaultServiceContent(defaultServiceNamePascalCase: string, appType: 'single' | 'mcp' | 'a2a'): string {
  const imports = new Set<string>(['Ctx', 'cli']);
  let needsZodImport = false;

  if (appType === 'mcp') {
    imports.add('mcp');
    imports.add('Body');
    needsZodImport = true;
  }
  if (appType === 'a2a') {
    imports.add('a2a');
    imports.add('Body');
    needsZodImport = true;
  }

  const sortedImports = Array.from(imports).sort();
  const importStatement = `import { ${sortedImports.join(', ')} } from '@arifwidianto/dawai-microservice';`;
  const zodImportStatement = needsZodImport ? "import { z } from 'zod';" : "// import { z } from 'zod';";

  const mcpSchemaContent = appType === 'mcp' ? `
const mcpTaskSchema = z.object({
  taskId: z.string().uuid(),
  prompt: z.string(),
  data: z.record(z.any()).optional(),
});
` : '';

  const mcpHandlerContent = appType === 'mcp' ? `
  // Example MCP Handler
  @mcp({ command: 'generate_text_mcp', schema: mcpTaskSchema })
  async generateTextMcp(@Body() task: z.infer<typeof mcpTaskSchema>, @Ctx() ctx: any) {
    ctx.stdout.write(\`[${defaultServiceNamePascalCase} MCP Server] Received task for command 'generate_text_mcp': \${task.taskId}\\n\`);
    // TODO: Implement text generation logic based on task.prompt and task.data
    const generatedText = \`Generated text for prompt: "\${task.prompt}" (Task ID: \${task.taskId})\`;
    ctx.stdout.write(\`[${defaultServiceNamePascalCase} MCP Server] Sending response for: \${task.taskId}\\n\`);
    return {
      taskId: task.taskId,
      status: 'completed',
      output: generatedText
    };
  }
` : '';

  const a2aSchemaContent = appType === 'a2a' ? `
const a2aRelayMessageSchema = z.object({
  messageId: z.string().uuid(),
  type: z.string(), // Example: 'https://didcomm.org/basicmessage/2.0/message'
  to: z.string(),    // Target DID
  from: z.string().optional(), // Sender DID
  body: z.record(z.any()), // Flexible body content
  created_time: z.number().optional(),
  expires_time: z.number().optional(),
});
` : '';

  const a2aHandlerContent = appType === 'a2a' ? `
  // Example A2A Handler
  @a2a({ command: 'process_a2a_relay', schema: a2aRelayMessageSchema })
  async processA2aRelay(@Body() message: z.infer<typeof a2aRelayMessageSchema>, @Ctx() ctx: any) {
    ctx.stdout.write(\`[${defaultServiceNamePascalCase} A2A Agent] Received A2A message '\${message.type}' (ID: \${message.messageId}) for DID: \${message.to}\\n\`);
    // TODO: Implement A2A message processing logic
    // This might involve routing to other internal services, cryptographic operations, etc.
    return {
      messageId: message.messageId,
      status: 'processed',
      note: 'Forwarded or handled by ${defaultServiceNamePascalCase}'
    };
  }
` : '';

  return `
${importStatement}
${zodImportStatement}
${mcpSchemaContent}${a2aSchemaContent}
// Example schema for ping (optional, remove if not needed)
// const pingSchema = z.object({});

export class ${defaultServiceNamePascalCase} {
  constructor() {
    // console.log('${defaultServiceNamePascalCase} instantiated');
  }

  @cli({ command: 'ping', description: 'A simple ping command to check if the service is responsive.' /* schema: pingSchema */ })
  async ping(@Ctx() ctx: any) {
    const message = 'pong from ${defaultServiceNamePascalCase}!';
    ctx.stdout.write(message + '\\n');
    return { response: message };
  }
${mcpHandlerContent}${a2aHandlerContent}
  async onModuleInit() {
    // console.log('${defaultServiceNamePascalCase} initialized');
  }

  async onApplicationShutdown() {
    // console.log('${defaultServiceNamePascalCase} shutting down');
  }
}
  `.trim() + '\n';
}
