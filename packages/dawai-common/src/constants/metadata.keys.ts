// Symbol or string keys for metadata

// General metadata keys stored within each decorator's metadata object
export const TRANSPORT_TYPE_METADATA = 'dawai:transport_type'; // Stores the TransportType enum value
export const SCHEMA_METADATA = 'dawai:schema'; // Stores the Zod schema object
export const DECORATOR_KEY_METADATA = 'dawai:decorator_key'; // Stores the unique key of the decorator itself (e.g., DECORATOR_KEY_CLI)
export const HANDLER_OPTIONS_METADATA = 'dawai:handler_options'; // Stores the raw options object passed to the decorator
export const DISABLED_METADATA = 'dawai:disabled'; // Stores boolean indicating if handler is disabled

// Metadata key for middleware applied to a handler method
export const MIDDLEWARE_METADATA = 'dawai:middleware';

// Unique keys for each method decorator. These are used as top-level keys
// in a method's metadata map to distinguish between multiple decorators on the same method.
export const DECORATOR_KEY_CRUD = 'dawai:decorator_crud';
export const DECORATOR_KEY_WS = 'dawai:decorator_ws';
export const DECORATOR_KEY_SSE = 'dawai:decorator_sse';
export const DECORATOR_KEY_CLI = 'dawai:decorator_cli';
export const DECORATOR_KEY_RPC = 'dawai:decorator_rpc';
export const DECORATOR_KEY_LLM = 'dawai:decorator_llm';
export const DECORATOR_KEY_MCP = 'dawai:decorator_mcp';
export const DECORATOR_KEY_A2A = 'dawai:decorator_a2a';

// Class-level decorator metadata
export const CLASS_DECORATOR_OPTIONS_METADATA = 'dawai:class_decorator_options'; // For @webservice(), @stdio() class decorators

// Parameter Decorator related
export const PARAM_TYPES_METADATA = 'design:paramtypes'; // Standard TypeScript metadata key for constructor/method parameter types
export const CUSTOM_PARAMS_METADATA = 'dawai:custom_params'; // Used by metadataStorage for parameter decorators

// Old/Legacy (potentially for removal or review if not used by common decorators)
// These might still be used by class decorators or older parts of the system.
// Review their usage before removing.
export const PATH_METADATA = 'dawai:path'; 
export const METHOD_METADATA = 'dawai:method';
