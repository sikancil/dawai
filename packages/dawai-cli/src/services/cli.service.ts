// packages/dawai-cli/src/services/cli.service.ts
import { z } from 'zod';
import { cli, Body, Ctx } from '@arifwidianto/dawai-microservice';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { toPascalCase, toCamelCase } from '../utils/stringUtils';
// import * as appGenerator from '../generators/app.generator'; // appGenerator is used by generateAppCmd
import * as monorepoGen from '../generators/monorepo.generator';
import * as appGen from '../generators/app.generator'; // Renamed for clarity
import * as sharedGen from '../generators/shared_package.generator';

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

// Define Zod schema for the 'generate service' command arguments
const generateServiceSchema = z.object({
  serviceName: z.string()
    .min(1, { message: "Service name cannot be empty." })
    .refine(name => /^[A-Z][a-zA-Z0-9_]*$/.test(name), {
      message: "Service name must be a valid PascalCase JavaScript class identifier (e.g., MyService, Another_Service)."
    }),
  // Add other potential options like --force, --path later
});
type GenerateServiceOptions = z.infer<typeof generateServiceSchema>;

// Define Zod schema for the 'generate app' command arguments
const generateAppSchema = z.object({
  appName: z.string()
    .min(1, { message: "App name cannot be empty." })
    .refine(name => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name), {
      message: "App name must be a valid kebab-case string (e.g., my-app, another-project)."
    }),
  defaultServiceName: z.string()
    .refine(name => /^[A-Z][a-zA-Z0-9_]*$/.test(name), {
      message: "Default service name must be a valid PascalCase JavaScript class identifier (e.g., MyService, Another_Service)."
    })
    .optional(),
  type: z.enum(['single', 'mcp', 'a2a']) // Updated enum
    .default('single')
    .optional(),
});
type GenerateAppOptions = z.infer<typeof generateAppSchema>;

// Define Zod schema for the 'generate monorepo' command arguments
const generateMonorepoSchema = z.object({
  monorepoName: z.string()
    .min(1, { message: "Monorepo name cannot be empty." })
    .refine(name => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name), {
      message: "Monorepo name must be a valid kebab-case string (e.g., my-monorepo)."
    }),
  services: z.string()
    .min(1, { message: "At least one service name must be provided for the --services option."})
    .transform(val =>
      val.split(',')
         .map(s => s.trim().toLowerCase())
         .filter(s => s && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
    ),
  sharedPackages: z.string()
    .optional()
    .transform(val =>
      val ? val.split(',')
               .map(s => s.trim().toLowerCase())
               .filter(s => s && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
          : []
    ),
  monorepoManager: z.enum(['npm', 'yarn', 'pnpm', 'lerna'])
    .default('npm')
    .optional(),
}).refine(data => data.services.length > 0, {
  message: "The --services option must contain at least one valid service name after parsing.",
  path: ["services"],
});
type GenerateMonorepoOptions = z.infer<typeof generateMonorepoSchema>;

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

  @cli({
    command: 'generate service', // StdioTransportAdapter should handle "generate service" as the command key
    description: 'Generates a new boilerplate service class file (e.g., MyExampleService).',
    schema: generateServiceSchema
  })
  async generateServiceCmd(
    @Body() options: GenerateServiceOptions,
    @Ctx() ctx: any
  ) {
    const { serviceName } = options; // serviceName is PascalCase from schema validation

    const generatedCode = `
// Example imports (uncomment and adjust as needed):
// import { Body, Ctx, cli, crud, mcp, ws, rpc, a2a, sse, llm, stdio, webservice } from '@arifwidianto/dawai-microservice';
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
  // Each method can be decorated with transport decorators like @cli, @crud, @ws, etc.
  // Example handler:
  // @cli({ command: '${serviceName.toLowerCase()}_example', schema: exampleSchema })
  // async exampleHandler(@Body() body: z.infer<typeof exampleSchema>, @Ctx() ctx: any) {
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

    const targetDir = path.resolve(process.cwd(), 'src', 'services');
    const targetFileName = `${serviceName}.service.ts`; // serviceName is already PascalCase
    const targetFilePath = path.join(targetDir, targetFileName);

    try {
      await fs.ensureDir(targetDir);
      await fs.writeFile(targetFilePath, generatedCode);

      ctx.stdout.write(chalk.green(`Successfully generated service file at: ${targetFilePath}\n`));
      return {
        message: `Service ${serviceName} generated successfully.`,
        serviceName: serviceName,
        path: targetFilePath
      };
    } catch (error: any) {
      ctx.stdout.write(chalk.red(`Error writing service file ${targetFilePath}: ${error.message}\n`));
      throw new Error(`File writing failed for ${targetFilePath}: ${error.message}`);
    }
    };
  }

  @cli({
    command: 'generate app',
    description: 'Generates a new minimal Dawai microservice application structure.',
    schema: generateAppSchema
  })
  async generateAppCmd(
    @Body() options: GenerateAppOptions,
    @Ctx() ctx: any
  ) {
    const { appName } = options; // appName is kebab-case
    const appType = options.type; // options.type will be 'single' or 'mcp' due to schema default
    // Ensure toPascalCase from stringUtils handles kebab-case to PascalCase correctly for service name
    const defaultServiceNamePascalCase = options.defaultServiceName || toPascalCase(appName);

    const rootDir = path.resolve(process.cwd(), appName);

    try {
      ctx.stdout.write(chalk.blue(`Generating app '${appName}' (Type: ${appType})...\n`));
      // The rest of the logic for directory/file creation remains here...
      // For this subtask, we are just acknowledging the type.
      // The actual generation logic might differ based on appType in subsequent steps.

      if (await fs.pathExists(rootDir)) {
        const errorMsg = `Directory '${rootDir}' already exists. Please remove it or choose a different app name.`;
        ctx.stdout.write(chalk.red(errorMsg) + '\n');
        throw new Error(errorMsg);
      }
      await fs.mkdir(rootDir);
      ctx.stdout.write(chalk.dim(`Created application directory: ${rootDir}`) + '\n');

      const srcDir = path.join(rootDir, 'src');
      const servicesDir = path.join(srcDir, 'services');
      await fs.ensureDir(srcDir);
      await fs.ensureDir(servicesDir);
      ctx.stdout.write(chalk.dim(`Created source and services directories.`) + '\n');

      // package.json
      const packageJsonContent = appGenerator.generatePackageJsonContent(appName);
      const packageJsonPath = path.join(rootDir, 'package.json');
      await fs.writeFile(packageJsonPath, packageJsonContent);
      ctx.stdout.write(chalk.dim(`Created ${packageJsonPath}`) + '\n');

      // tsconfig.json
      const tsConfigJsonContent = appGenerator.generateTsConfigJsonContent();
      const tsConfigJsonPath = path.join(rootDir, 'tsconfig.json');
      await fs.writeFile(tsConfigJsonPath, tsConfigJsonContent);
      ctx.stdout.write(chalk.dim(`Created ${tsConfigJsonPath}`) + '\n');

      // .gitignore
      const gitIgnoreContent = appGenerator.generateGitIgnoreContent();
      const gitIgnorePath = path.join(rootDir, '.gitignore');
      await fs.writeFile(gitIgnorePath, gitIgnoreContent);
      ctx.stdout.write(chalk.dim(`Created ${gitIgnorePath}`) + '\n');

      // src/index.ts
      const appIndexTsContent = appGenerator.generateAppIndexTsContent(defaultServiceNamePascalCase, appType);
      const appIndexTsPath = path.join(srcDir, 'index.ts');
      await fs.writeFile(appIndexTsPath, appIndexTsContent);
      ctx.stdout.write(chalk.dim(`Created ${appIndexTsPath}`) + '\n');

      // src/services/<DefaultServiceName>.service.ts
      const defaultServiceContent = appGenerator.generateDefaultServiceContent(defaultServiceNamePascalCase, appType);
      const defaultServicePath = path.join(servicesDir, `${defaultServiceNamePascalCase}.service.ts`);
      await fs.writeFile(defaultServicePath, defaultServiceContent);
      ctx.stdout.write(chalk.dim(`Created ${defaultServicePath}`) + '\n');

      let successMsg = `Successfully generated Dawai application '${appName}'`;
      if (appType !== 'single') {
        successMsg += ` (Type: ${appType.toUpperCase()})`;
      }
      successMsg += '!';

      ctx.stdout.write(chalk.green(successMsg) + '\n');
      ctx.stdout.write(chalk.yellow(`To get started:
  cd ${appName}
  npm install (or yarn/pnpm)
  npm run dev
`) + '\n');
      return {
        message: successMsg,
        appDirectory: rootDir,
        appType: appType
      };

    } catch (error: any) {
      ctx.stdout.write(chalk.red(`Error generating app '${appName}' (Type: ${appType}): ${error.message}\n`));
      // Clean up created directory if error occurred mid-process (optional, basic for now)
      if (await fs.pathExists(rootDir)) {
        // await fs.remove(rootDir); // Be careful with this in a real CLI
      }
      throw new Error(`App generation failed: ${error.message}`);
    }
  }

  @cli({
    command: 'generate monorepo',
    description: 'Generates a new monorepo with multiple Dawai microservices and shared packages.',
    schema: generateMonorepoSchema
  })
  async generateMonorepoCmd(
    @Body() options: GenerateMonorepoOptions,
    @Ctx() ctx: any
  ) {
    const { monorepoName, services, sharedPackages, monorepoManager } = options;
    const rootDir = path.resolve(process.cwd(), monorepoName);

    ctx.stdout.write(chalk.blue(`Generating monorepo '${monorepoName}'...\n`));

    try {
      // 1. Check rootDir existence and create it
      if (await fs.pathExists(rootDir)) {
        const errorMsg = `Directory '${rootDir}' already exists. Please remove it or choose a different monorepo name.`;
        ctx.stdout.write(chalk.red(errorMsg) + '\n');
        throw new Error(errorMsg);
      }
      await fs.mkdir(rootDir);
      ctx.stdout.write(chalk.dim(`Created monorepo directory: ${rootDir}`) + '\n');

      // 2. Write root monorepo files
      ctx.stdout.write(chalk.blue('Generating root monorepo files...') + '\n');
      await fs.writeFile(path.join(rootDir, 'package.json'), monorepoGen.generateMonorepoPackageJsonContent(monorepoName, monorepoManager, services, sharedPackages));
      await fs.writeFile(path.join(rootDir, 'tsconfig.json'), monorepoGen.generateMonorepoTsConfigJsonContent(services, sharedPackages));
      await fs.writeFile(path.join(rootDir, 'tsconfig.package.base.json'), monorepoGen.generateTsConfigPackageBaseJsonContent());
      await fs.writeFile(path.join(rootDir, '.gitignore'), monorepoGen.generateMonorepoGitIgnoreContent());
      await fs.writeFile(path.join(rootDir, 'README.md'), monorepoGen.generateMonorepoReadmeContent(monorepoName));

      if (monorepoManager === 'lerna') {
        const npmClient = (options.monorepoManager === 'npm' || options.monorepoManager === 'yarn' || options.monorepoManager === 'pnpm') ? options.monorepoManager : 'npm';
        await fs.writeFile(path.join(rootDir, 'lerna.json'), monorepoGen.generateLernaJsonContent(monorepoName, npmClient));
      }
      if (monorepoManager === 'pnpm') {
        await fs.writeFile(path.join(rootDir, 'pnpm-workspace.yaml'), monorepoGen.generatePnpmWorkspaceYamlContent());
      }
      ctx.stdout.write(chalk.dim('Root files generated.') + '\n');

      // 3. Create packages/ directory
      const packagesDir = path.join(rootDir, 'packages');
      await fs.ensureDir(packagesDir);

      // 4. Generate Service Packages
      if (services && services.length > 0) {
        ctx.stdout.write(chalk.blue('Generating service packages...') + '\n');
        for (const serviceNameKebab of services) {
          const serviceDir = path.join(packagesDir, serviceNameKebab);
          await fs.ensureDir(serviceDir);
          const serviceNamePascal = toPascalCase(serviceNameKebab);

          const srcDir = path.join(serviceDir, 'src');
          const servicesSubDir = path.join(srcDir, 'services');
          await fs.ensureDir(srcDir);
          await fs.ensureDir(servicesSubDir);

          await fs.writeFile(path.join(serviceDir, 'package.json'), appGen.generatePackageJsonContent(serviceNameKebab, serviceNamePascal, monorepoName));
          await fs.writeFile(path.join(serviceDir, 'tsconfig.json'), appGen.generateMonorepoMemberServiceTsConfigJsonContent());
          await fs.writeFile(path.join(srcDir, 'index.ts'), appGen.generateAppIndexTsContent(serviceNamePascal, 'single'));
          await fs.writeFile(path.join(servicesSubDir, `${serviceNamePascal}.service.ts`), appGen.generateDefaultServiceContent(serviceNamePascal, 'single'));
          ctx.stdout.write(chalk.dim(`Generated service package: packages/${serviceNameKebab}`) + '\n');
        }
      }

      // 5. Generate Shared Packages
      if (sharedPackages && sharedPackages.length > 0) {
        ctx.stdout.write(chalk.blue('Generating shared packages...') + '\n');
        for (const sharedPkgNameKebab of sharedPackages) {
          const sharedPkgDir = path.join(packagesDir, sharedPkgNameKebab);
          await fs.ensureDir(sharedPkgDir);
          await fs.ensureDir(path.join(sharedPkgDir, 'src'));

          await fs.writeFile(path.join(sharedPkgDir, 'package.json'), sharedGen.generateSharedPackageJsonContent(sharedPkgNameKebab, monorepoName));
          await fs.writeFile(path.join(sharedPkgDir, 'tsconfig.json'), sharedGen.generateSharedPackageTsConfigJsonContent());
          await fs.writeFile(path.join(sharedPkgDir, 'src', 'index.ts'), sharedGen.generateSharedPackageIndexTsContent(sharedPkgNameKebab));
          ctx.stdout.write(chalk.dim(`Generated shared package: packages/${sharedPkgNameKebab}`) + '\n');
        }
      }

      // 6. Final success message
      let bootstrapCommand = "npm install";
      if (monorepoManager === 'yarn') bootstrapCommand = "yarn install";
      else if (monorepoManager === 'pnpm') bootstrapCommand = "pnpm install";
      else if (monorepoManager === 'lerna') {
        // Lerna might use its own bootstrap or rely on the npmClient's install
        const lernaJson = JSON.parse(monorepoGen.generateLernaJsonContent(monorepoName, (options.monorepoManager === 'npm' || options.monorepoManager === 'yarn' || options.monorepoManager === 'pnpm') ? options.monorepoManager : 'npm'));
        if (lernaJson.useWorkspaces) {
            bootstrapCommand = `${lernaJson.npmClient} install`;
        } else {
            bootstrapCommand = "lerna bootstrap";
        }
      }


      const buildCommand = (monorepoManager === 'lerna' && !JSON.parse(monorepoGen.generateLernaJsonContent(monorepoName, (options.monorepoManager === 'npm' || options.monorepoManager === 'yarn' || options.monorepoManager === 'pnpm') ? options.monorepoManager : 'npm')).useWorkspaces)
                         ? "lerna run build --stream"
                         : "npm run build";


      const successMsg = `Successfully generated Dawai monorepo '${monorepoName}'!`;
      ctx.stdout.write(chalk.green(successMsg) + '\n');
      ctx.stdout.write(chalk.yellow(`To get started:
  cd ${monorepoName}
  ${bootstrapCommand}
  ${buildCommand}
`) + '\n');

      return { message: successMsg, monorepoDirectory: rootDir };

    } catch (error: any) {
      ctx.stdout.write(chalk.red(`Error generating monorepo '${monorepoName}': ${error.message}\n`));
      // Consider more robust cleanup if needed
      // if (await fs.pathExists(rootDir)) {
      //   await fs.remove(rootDir);
      // }
      throw new Error(`Monorepo generation failed: ${error.message}`);
    }
  }
}
