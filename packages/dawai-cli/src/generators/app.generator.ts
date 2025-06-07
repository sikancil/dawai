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

export function generateAppIndexTsContent(defaultServiceNamePascalCase: string): string {
  // Assuming HttpTransportAdapter might still be in the main package for now,
  // or adjust if it's confirmed to be @arifwidianto/dawai-http-transport
  return `
import { Microservice, MicroserviceOptions, HttpTransportAdapter } from '@arifwidianto/dawai-microservice';
// If HttpTransportAdapter is in its own package:
// import { HttpTransportAdapter } from '@arifwidianto/dawai-http-transport';
import { StdioTransportAdapter } from '@arifwidianto/dawai-stdio';
import { ${defaultServiceNamePascalCase} } from './services/${defaultServiceNamePascalCase}.service';
import 'reflect-metadata'; // Ensure metadata reflection is enabled

async function bootstrap() {
  const microserviceOptions: MicroserviceOptions = {
    webservice: {
      enabled: true,
      options: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
      }
    },
    stdio: {
      enabled: true,
      options: {
        interactive: false,
      }
    }
  };

  const app = new Microservice(${defaultServiceNamePascalCase}, microserviceOptions);

  app.registerTransport(new HttpTransportAdapter());
  app.registerTransport(new StdioTransportAdapter());

  try {
    await app.bootstrap();
    await app.listen();
    console.log(\`${defaultServiceNamePascalCase} is running with HTTP and STDIO transports.\`);
    // Example CLI command to test, assuming the default service has a 'ping' command
    console.log(\`Try: node dist/src/index.js ping\`);
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

export function generateDefaultServiceContent(defaultServiceNamePascalCase: string): string {
  // Use the more general anyCaseToPascalCase for the service name itself as it's already Pascal.
  // For command name from service name, toLowerCase is fine.
  const commandName = defaultServiceNamePascalCase.toLowerCase() + '_ping';
  return `
import { cli, Ctx } from '@arifwidianto/dawai-microservice';
// import { Body } from '@arifwidianto/dawai-microservice';
// import { z } from 'zod';

// Example schema (optional, remove if not needed for ping)
// const pingSchema = z.object({});

// Service decorator can be added later if needed e.g. @stdio() or @webservice() at class level
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

  async onModuleInit() {
    // console.log('${defaultServiceNamePascalCase} initialized');
  }

  async onApplicationShutdown() {
    // console.log('${defaultServiceNamePascalCase} shutting down');
  }
}
  `.trim() + '\n';
}
