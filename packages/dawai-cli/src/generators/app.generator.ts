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

export function generateAppIndexTsContent(defaultServiceNamePascalCase: string, appType: 'single' | 'mcp'): string {
  const mcpServerConfig = appType === 'mcp' ? `
    mcpServer: {
      enabled: true,
      transport: 'stdio', // Default transport for MCP server
      options: {
        name: \`${defaultServiceNamePascalCase} MCP Server\`,
        description: 'A Model Context Protocol server for this application.',
        version: '1.0.0',
      },
    },` : '';

  return `
import { Microservice, MicroserviceOptions, HttpTransportAdapter } from '@arifwidianto/dawai-microservice';
// If HttpTransportAdapter is in its own package:
// import { HttpTransportAdapter } from '@arifwidianto/dawai-http-transport';
import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio';
import { ${defaultServiceNamePascalCase} } from './services/${defaultServiceNamePascalCase}.service';
import 'reflect-metadata'; // Ensure metadata reflection is enabled

async function bootstrap() {
  const microserviceOptions: MicroserviceOptions = {${mcpServerConfig}
    webservice: { // Example: enable http by default
      enabled: true,
      options: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
        // Further HTTP options can be added here
      }
    },
    stdio: { // Example: enable stdio by default for CLI commands within the app
      enabled: true,
      options: {
        // For an app that might also be an MCP server, interactive might be false for stdio
        // to let MCP take over stdio if it's the designated transport.
        // If MCP uses a different transport (e.g. custom TCP), then interactive can be true here.
        interactive: ${appType === 'mcp' ? 'false' : 'true'}, // Adjust based on typical MCP setup
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
    console.log(\`App Type: ${appType}\`);
    if (appType !== 'mcp') {
      console.log(\`Try CLI: node dist/src/index.js ping\`);
    } else {
      console.log(\`MCP Server mode enabled. Use an MCP client to interact or define specific CLI commands.\`);
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

export function generateDefaultServiceContent(defaultServiceNamePascalCase: string, appType: 'single' | 'mcp'): string {
  const imports = new Set<string>(['Ctx', 'cli']);
  if (appType === 'mcp') {
    imports.add('mcp');
    imports.add('Body'); // MCP handler likely needs @Body
  }

  const sortedImports = Array.from(imports).sort();
  const importStatement = `import { ${sortedImports.join(', ')} } from '@arifwidianto/dawai-microservice';`;

  const mcpSchemaContent = appType === 'mcp' ? `
const mcpTaskSchema = z.object({
  taskId: z.string().uuid(),
  prompt: z.string(),
  data: z.record(z.any()).optional(),
});

// Example result schema (optional, for type safety)
// const mcpResultSchema = z.object({
//   taskId: z.string().uuid(),
//   status: z.string(),
//   output: z.string().optional(),
//   error: z.string().optional(),
// });
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

  return `
${importStatement}
${appType === 'mcp' ? "import { z } from 'zod';" : "// import { z } from 'zod';"}
${mcpSchemaContent}
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
${mcpHandlerContent}
  async onModuleInit() {
    // console.log('${defaultServiceNamePascalCase} initialized');
  }

  async onApplicationShutdown() {
    // console.log('${defaultServiceNamePascalCase} shutting down');
  }
}
  `.trim() + '\n';
}
