import { StdioTransportAdapter } from '../core/transport.adapter';
import { HandlerMetadata } from '@arifwidianto/dawai-microservice'; // Assuming HandlerMetadata is from here or common

/**
 * Defines the context object that will be injected into handlers
 * when using the `@Ctx()` decorator with the STDIO transport.
 */
export interface StdioContext {
  /**
   * The raw command line input string (if applicable).
   */
  rawInput?: string;

  /**
   * The parsed arguments object from yargs (before Zod validation).
   */
  argv?: Record<string, any>;

  /**
   * The validated and potentially transformed arguments (after Zod validation, if schema provided).
   */
  validatedArgs?: Record<string, any>;
  
  /**
   * Standard output stream.
   */
  stdout: NodeJS.WriteStream;

  /**
   * Standard input stream.
   */
  stdin: NodeJS.ReadStream;

  /**
   * A reference to the StdioTransportAdapter instance.
   */
  adapter: StdioTransportAdapter;

  /**
   * Metadata for the handler being executed.
   */
  handlerMetadata: HandlerMetadata; // Or a more specific type if available
}
