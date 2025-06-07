/**
 * A simple utility function to demonstrate sharing code.
 * @param name The name to greet.
 * @returns A greeting string.
 */
export function greet(name: string): string {
  return `Hello, ${name}! Welcome to Dawai.`;
}

/**
 * A shared interface example.
 */
export interface Loggable {
  getLogPrefix(): string;
}
