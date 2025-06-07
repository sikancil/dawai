// packages/dawai-cli/src/generators/shared_package.generator.ts
import { toCamelCase } from '../utils/stringUtils'; // Assuming stringUtils is one level up from generators

export function generateSharedPackageJsonContent(packageName: string, monorepoScope?: string): string {
  const name = monorepoScope ? `@${monorepoScope}/${packageName}` : packageName;
  return JSON.stringify({
    name: name,
    version: "0.1.0",
    private: true, // Typically shared packages within a monorepo are private unless intended for separate publishing
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      "build": "rimraf dist && tsc -p tsconfig.json",
      "dev": "tsc -p tsconfig.json --watch",
      "test": `echo "Error: no test specified for ${packageName}" && exit 0` // Default to pass
    },
    devDependencies: {
      "typescript": "^5.0.0", // Align with root/other packages
      "rimraf": "^5.0.0"      // Align with root/other packages
    },
    // No dependencies by default for a simple shared package
  }, null, 2);
}

export function generateSharedPackageTsConfigJsonContent(relativePathToRoot: string = '../../'): string {
  return JSON.stringify({
    "extends": `${relativePathToRoot}tsconfig.package.base.json`,
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src",
      "tsBuildInfoFile": "./dist/.tsbuildinfo"
      // `composite` and `declaration` are inherited from the base or should be set there.
      // If tsconfig.package.base.json doesn't set them, they can be added here too.
      // "composite": true,
      // "declaration": true,
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/__tests__/**", "**/*.spec.ts"]
    // "references": [] // Add references if this shared package depends on others in the monorepo
  }, null, 2);
}

export function generateSharedPackageIndexTsContent(packageName: string): string {
  const camelCasePackageName = toCamelCase(packageName);
  return `// packages/${packageName}/src/index.ts

// Example export:
export const ${camelCasePackageName}Placeholder = true;

export function getGreetingFrom${toPascalCase(camelCasePackageName)}(): string {
  console.log('Placeholder function from ${packageName} called.');
  return "Hello from ${packageName}!";
}

// Add more shared utilities, types, or constants here.
// For example:
// export * from './types';
// export * from './utils';
`;
}

// Helper for toPascalCase if not imported, or ensure it's available via stringUtils
function toPascalCase(str: string): string {
    if (!str) return '';
    const camelCase = toCamelCase(str); // First convert to camelCase to handle various inputs
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}
