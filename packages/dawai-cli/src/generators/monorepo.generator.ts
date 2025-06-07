// packages/dawai-cli/src/generators/monorepo.generator.ts

export function generateMonorepoPackageJsonContent(
  monorepoName: string,
  manager: 'npm' | 'yarn' | 'pnpm' | 'lerna',
  _serviceNames: string[],
  _sharedPackageNames: string[]
): string {
  const scripts: Record<string, string> = {
    "build": manager === 'lerna' ? "lerna run build --stream" : "tsc -b tsconfig.json", // tsc -b for solution style
    "clean": "rimraf packages/*/dist packages/*/node_modules node_modules dist .tsbuildinfo", // Added more to clean
    // Bootstrap script depends on the manager
  };

  switch (manager) {
    case 'npm':
      scripts["bootstrap"] = "npm install";
      scripts["test"] = "npm -ws run test"; // Example for running tests in workspaces
      break;
    case 'yarn':
      scripts["bootstrap"] = "yarn install";
      scripts["test"] = "yarn workspaces run test";
      break;
    case 'pnpm':
      scripts["bootstrap"] = "pnpm install";
      scripts["test"] = "pnpm -r test";
      break;
    case 'lerna':
      scripts["bootstrap"] = "lerna bootstrap";
      scripts["test"] = "lerna run test";
      scripts["publish:lerna"] = "lerna publish";
      break;
  }

  const devDependencies: Record<string, string> = {
    "typescript": "^5.0.0",
    "rimraf": "^5.0.0",
    // Add tsc-watch here if a root dev script is desired, though typically run per-package
  };

  if (manager === 'lerna') {
    devDependencies["lerna"] = "^7.0.0";
  }

  const packageJson: any = {
    name: monorepoName,
    private: true,
    version: "0.1.0",
    scripts,
    devDependencies,
  };

  if (manager === 'npm' || manager === 'yarn' || manager === 'pnpm') {
    packageJson.workspaces = ["packages/*"];
  }
  // Lerna can also use workspaces, often configured in lerna.json with useWorkspaces: true

  return JSON.stringify(packageJson, null, 2);
}

export function generateMonorepoTsConfigJsonContent( // Renamed to generateMonorepoTsConfigJsonContent for clarity (root tsconfig)
  serviceNames: string[],
  sharedPackageNames: string[]
): string {
  const references = [
    ...serviceNames.map(name => ({ path: `./packages/${name}` })),
    ...sharedPackageNames.map(name => ({ path: `./packages/${name}` })),
  ];
  // Add references to core dawai packages if they are part of the same monorepo and need to be built from source
  // For this generator, we assume they are installed as dependencies.
  // references.push({ path: "./packages/dawai-microservice" }); // Example if local
  // references.push({ path: "./packages/dawai-stdio" });       // Example if local

  return JSON.stringify({
    // This is a solution-style tsconfig.json (tsconfig.json at the root)
    // It's used to orchestrate builds of the packages in the monorepo.
    // Actual compilation options for packages should be in their respective tsconfig.json files,
    // possibly extending a common tsconfig.base.json or tsconfig.package.json.
    files: [], // Must be empty for solution-style tsconfig with only references
    references,
    compilerOptions: { // These are not used for compilation itself but help IDEs
        composite: false, // Not a composite project itself, but references composite projects
        declaration: false,
        // other editor/IDE aiding options can go here if needed
    }
  }, null, 2);
}

export function generatePnpmWorkspaceYamlContent(): string {
  return `packages:\n  - 'packages/*'\n`;
}

export function generateLernaJsonContent(
  _monorepoName: string,
  manager: 'npm' | 'yarn' | 'pnpm'
): string {
  const lernaConfig: any = {
    packages: ["packages/*"],
    version: "0.1.0",
  };
  // If using NPM, Yarn, or PNPM workspaces, Lerna can leverage them.
  if (manager === 'npm' || manager === 'yarn' || manager === 'pnpm') {
    lernaConfig.npmClient = manager;
    lernaConfig.useWorkspaces = true;
  } else {
     lernaConfig.npmClient = 'npm'; // Default if manager is 'lerna' itself without workspace integration
  }
  return JSON.stringify(lernaConfig, null, 2);
}

export function generateMonorepoGitIgnoreContent(): string {
  return `
# Node / Package Managers
node_modules
**/node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Build output
dist
**/dist
build
**/build
out
**/out
.tsbuildinfo
**/.tsbuildinfo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE / Editor specific
.idea
.vscode/
*.sublime-project
*.sublime-workspace
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Environment files
.env
.env.*
!/.env.example
  `.trim() + '\n';
}

export function generateMonorepoReadmeContent(monorepoName: string): string {
  return `
# ${monorepoName}

This is a Dawai microservices monorepo.

## Structure

-   \`packages/\`: Contains all microservices and shared libraries.

## Getting Started

1.  **Install dependencies for all packages:**
    \`\`\`bash
    # Using NPM Workspaces (default if chosen)
    npm install
    # Using Yarn Workspaces (if chosen)
    # yarn install
    # Using PNPM Workspaces (if chosen)
    # pnpm install
    # Using Lerna (if chosen, and not using workspaces)
    # npm install # To install Lerna first if not global, then:
    # lerna bootstrap
    \`\`\`
    *(If using Lerna with workspaces, \`npm/yarn/pnpm install\` at the root is usually sufficient).*

2.  **Build all packages:**
    \`\`\`bash
    # This typically uses TypeScript project references via tsc -b
    npm run build
    # (If using Lerna without tsc -b for root, 'lerna run build --stream' might be used)
    \`\`\`

3.  **Run a specific service (example for 'service-a' if it exists):**
    \`\`\`bash
    cd packages/service-a
    npm start # Or yarn start / pnpm start
    \`\`\`

## Available Scripts (Root \`package.json\`)

-   \`npm run bootstrap\` (or \`yarn install\` / \`pnpm install\` / \`lerna bootstrap\`): Installs dependencies.
-   \`npm run build\`: Builds all packages (typically using \`tsc -b tsconfig.json\`).
-   \`npm run clean\`: Removes all \`dist\`, \`node_modules\`, and \`.tsbuildinfo\` files.
-   \`npm run test\` (or equivalent for chosen manager): Runs tests across packages.

*(Refer to individual package \`README.md\` files for more specific instructions.)*
  `.trim() + '\n';
}

// Base tsconfig for individual packages within the monorepo to extend
export function generateTsConfigPackageBaseJsonContent(): string {
    return JSON.stringify({
      "$schema": "https://json.schemastore.org/tsconfig",
      "compilerOptions": {
        "target": "ES2022",
        "module": "commonjs",
        "moduleResolution": "node",
        "outDir": "./dist",
        "rootDir": "./src",
        "esModuleInterop": true,
        "strict": true,
        "skipLibCheck": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "declaration": true,
        "composite": true, // Important for project references
        "declarationMap": true, // Optional: for better IDE support with composite projects
        "sourceMap": true,    // Optional: for easier debugging
         "tsBuildInfoFile": "./dist/.tsbuildinfo" // Specific to each package
      },
      "exclude": ["node_modules", "dist", "**/__tests__/**", "**/*.spec.ts"]
    }, null, 2);
  }
