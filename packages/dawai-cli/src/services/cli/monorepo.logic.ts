// import { Ctx } from '@arifwidianto/dawai-microservice'; // Not needed if ctx is 'any'
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { TextCase } from '@arifwidianto/dawai-common';
import { monorepoGen, appGen, sharedGen } from '../../generators';
import { GenerateMonorepoOptions } from './schemas';

export async function executeGenerateMonorepoCommand(
  options: GenerateMonorepoOptions,
  ctx: any // Changed Ctx type to any
): Promise<{ message: string, monorepoDirectory: string } | { message: string, error: true }> {
  const { monorepoName, services, sharedPackages } = options;
  const monorepoManager = options.monorepoManager!;
  const rootDir = path.resolve(process.cwd(), monorepoName);

  ctx.stdout.write(chalk.blue(`Generating monorepo '${monorepoName}'...\n`));

  try {
    if (await fs.pathExists(rootDir)) {
      const errorMsg = `Directory '${rootDir}' already exists. Please remove it or choose a different monorepo name.`;
      ctx.stdout.write(chalk.red(errorMsg) + '\n');
      return { message: errorMsg, error: true };
    }
    await fs.mkdir(rootDir);
    ctx.stdout.write(chalk.dim(`Created monorepo directory: ${rootDir}`) + '\n');

    ctx.stdout.write(chalk.blue('Generating root monorepo files...') + '\n');
    await fs.writeFile(path.join(rootDir, 'package.json'), monorepoGen.generateMonorepoPackageJsonContent(monorepoName, monorepoManager, services, sharedPackages || []));
    await fs.writeFile(path.join(rootDir, 'tsconfig.json'), monorepoGen.generateMonorepoTsConfigJsonContent(services, sharedPackages || []));
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

    const packagesDir = path.join(rootDir, 'packages');
    await fs.ensureDir(packagesDir);

    if (services && services.length > 0) {
      ctx.stdout.write(chalk.blue('Generating service packages...') + '\n');
      for (const serviceNameKebab of services) {
        const serviceDir = path.join(packagesDir, serviceNameKebab);
        await fs.ensureDir(serviceDir);
        const serviceNamePascal = TextCase.pascalCase(serviceNameKebab);

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

    let bootstrapCommand = "npm install";
    if (monorepoManager === 'yarn') bootstrapCommand = "yarn install";
    else if (monorepoManager === 'pnpm') bootstrapCommand = "pnpm install";
    else if (monorepoManager === 'lerna') {
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
    const errorMessage = `Error generating monorepo '${monorepoName}': ${error.message}`;
    ctx.stdout.write(chalk.red(`${errorMessage}\n`));
    return { message: errorMessage, error: true };
  }
}
