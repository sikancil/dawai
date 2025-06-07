export function toPascalCase(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

export function toCamelCase(str: string): string { // Assuming input might be Kebab or Snake that needs full conversion
  if (!str) return '';
  // Convert to lower case first to handle mixed cases, then remove non-alphanumeric and capitalize the next char
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
            // If the very first char was part of a separator sequence (e.g. _myVar), it might be capitalized.
            // Ensure first char is lowercase unless it's a single letter or already so.
            // A simpler approach if the string is known not to start with a separator:
            .replace(/^(.)/, char => char.toLowerCase()); // Ensure first char is lower if not already due to toLowerCase()
}
