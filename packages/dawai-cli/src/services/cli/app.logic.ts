// import { Ctx } from '@arifwidianto/dawai-microservice'; // Not needed if ctx is 'any'
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { TextCase } from '@arifwidianto/dawai-common';
import { appGen } from '../../generators';
import { GenerateAppOptions } from './schemas';

export async function executeGenerateAppCommand(
  options: GenerateAppOptions,
  ctx: any // Changed Ctx type to any
): Promise<{ message: string, appDirectory: string, appType: string } | { message: string, error: true }> {
  const { name, path: customPath } = options; // Use 'name' and 'path' from options
  const appType = options.type || 'single'; // Default to 'single' if not provided
  const defaultServiceNamePascalCase = options.defaultServiceName || TextCase.pascalCase(name);
  const baseDir = customPath ? path.resolve(customPath) : process.cwd();
  const rootDir = path.join(baseDir, name);

  try {
    ctx.stdout.write(chalk.blue(`Generating app '${name}' (Type: ${appType}) at ${rootDir}...\n`));

    if (await fs.pathExists(rootDir)) {
      const errorMsg = `Directory '${rootDir}' already exists. Please remove it or choose a different app name.`;
      ctx.stdout.write(chalk.red(errorMsg) + '\n');
      return { message: errorMsg, error: true };
    }
    await fs.ensureDir(rootDir); // Use ensureDir to create path if it doesn't exist
    ctx.stdout.write(chalk.dim(`Ensured application directory exists: ${rootDir}`) + '\n');

    const srcDir = path.join(rootDir, 'src');
    const servicesDir = path.join(srcDir, 'services');
    await fs.ensureDir(srcDir);
    await fs.ensureDir(servicesDir);
    ctx.stdout.write(chalk.dim(`Created source and services directories.`) + '\n');

    const packageJsonContent = appGen.generatePackageJsonContent(name, defaultServiceNamePascalCase);
    const packageJsonPath = path.join(rootDir, 'package.json');
    await fs.writeFile(packageJsonPath, packageJsonContent);
    ctx.stdout.write(chalk.dim(`Created ${packageJsonPath}`) + '\n');

    const tsConfigJsonContent = appGen.generateTsConfigJsonContent();
    const tsConfigJsonPath = path.join(rootDir, 'tsconfig.json');
    await fs.writeFile(tsConfigJsonPath, tsConfigJsonContent);
    ctx.stdout.write(chalk.dim(`Created ${tsConfigJsonPath}`) + '\n');

    const gitIgnoreContent = appGen.generateGitIgnoreContent();
    const gitIgnorePath = path.join(rootDir, '.gitignore');
    await fs.writeFile(gitIgnorePath, gitIgnoreContent);
    ctx.stdout.write(chalk.dim(`Created ${gitIgnorePath}`) + '\n');

    const appIndexTsContent = appGen.generateAppIndexTsContent(defaultServiceNamePascalCase, appType as 'single' | 'mcp' | 'a2a');
    const appIndexTsPath = path.join(srcDir, 'index.ts');
    await fs.writeFile(appIndexTsPath, appIndexTsContent);
    ctx.stdout.write(chalk.dim(`Created ${appIndexTsPath}`) + '\n');

    const defaultServiceContent = appGen.generateDefaultServiceContent(defaultServiceNamePascalCase, appType as 'single' | 'mcp' | 'a2a');
    const defaultServicePath = path.join(servicesDir, `${defaultServiceNamePascalCase}.service.ts`);
    await fs.writeFile(defaultServicePath, defaultServiceContent);
    ctx.stdout.write(chalk.dim(`Created ${defaultServicePath}`) + '\n');

    let successMsg = `Successfully generated Dawai application '${name}'`;
    if (appType !== 'single') {
      successMsg += ` (Type: ${appType.toUpperCase()})`;
    }
    successMsg += '!';

    ctx.stdout.write(chalk.green(successMsg) + '\n');
    ctx.stdout.write(chalk.yellow(`To get started:
  cd ${customPath ? path.join(customPath, name) : name}
  npm install (or yarn/pnpm)
  npm run dev
`) + '\n');
    return {
      message: successMsg,
      appDirectory: rootDir,
      appType: appType
    };

  } catch (error: any) {
    const errorMessage = `Error generating app '${name}' (Type: ${appType}) at ${rootDir}: ${error.message}`;
    ctx.stdout.write(chalk.red(`${errorMessage}\n`));
    return { message: errorMessage, error: true };
  }
}
