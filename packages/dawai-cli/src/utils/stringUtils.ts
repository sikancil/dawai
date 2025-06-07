export function toPascalCase(str: string): string {
  if (!str) return '';
  // Assuming input is likely camelCase or similar, a simpler conversion:
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toCamelCase(str: string): string {
  if (!str) return '';
  // If it's already camelCase or needs to be ensured:
  // This simple version assumes it might already be mostly camelCase or PascalCase
  return str.charAt(0).toLowerCase() + str.slice(1);
}
