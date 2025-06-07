export function toPascalCase(str: string): string {
  if (!str) return '';
  // Convert kebab-case (e.g., my-app-name) or snake_case to PascalCase
  return str.toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, char => char.toUpperCase());
}

export function toCamelCase(str: string): string {
  if (!str) return '';
  // Convert kebab-case or snake_case to camelCase
  return str.toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, char => char.toLowerCase()); // First char lowercase for camel
}
