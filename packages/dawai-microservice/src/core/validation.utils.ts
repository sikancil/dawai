import { metadataStorage } from '../decorators/metadata.storage';
import { ParameterType } from '@arifwidianto/dawai-common';
import 'reflect-metadata'; // Required for Reflect.getMetadata
// Import relevant decorator option types if needed for deeper schema checks, for now, checking existence of 'schema' property is enough.
// import { McpDecoratorOptions, RpcDecoratorOptions, A2aDecoratorOptions, CliDecoratorOptions, CrudDecoratorOptions, WsDecoratorOptions, LlmDecoratorOptions } from '../decorator.options';

export interface ValidationSuggestion {
  severity: 'warning' | 'error' | 'info'; // For future use, default to 'warning'
  message: string;
  className: string;
  methodName?: string;
  parameterIndex?: number;

  // New structured fields:
  decoratorInvolved?: string; // e.g., "@crud", "@Body"
  keyInvolved?: string;       // e.g., "method" (option of @crud), "schema", or a parameter name
  expectedPattern?: string;   // Description of the expected pattern, value, or state
  actualPattern?: string;     // Description of the actual pattern, value, or state found
  suggestionCode?: string;    // A unique code for the type of suggestion (e.g., "DAWAI-VAL-001")
}

export function validateServiceDefinition(serviceClass: Function): ValidationSuggestion[] {
  const suggestions: ValidationSuggestion[] = [];
  const className = serviceClass.name;

  // TODO: Implement class-level decorator checks (e.g., if @webservice is on a non-class)
  // For now, assume class decorators are correctly placed by TypeScript.

  const methodMetadatas = metadataStorage.getAllMethodMetadata(serviceClass);
  if (!methodMetadatas) {
    return suggestions; // No methods decorated, or serviceClass not found in metadata
  }

  for (const [methodName, methodMeta] of methodMetadatas.entries()) {
    // Check for schema-handler mismatch
    const schemaBearingDecoratorKeys = ['cli', 'crud', 'ws', 'rpc', 'mcp', 'a2a', 'llm'];
    let methodHasSchema = false;
    let decoratorNameWithSchema = '';

    for (const key of schemaBearingDecoratorKeys) {
      if (methodMeta[key] && methodMeta[key].schema) {
        methodHasSchema = true;
        decoratorNameWithSchema = `@${key}`;
        break;
      }
    }

    // Check for @Body() on methods decorated with @sse
    if (methodMeta.sse) { // If the method is an SSE handler
      const paramsForSse = metadataStorage.getParameterMetadata(serviceClass, methodName);
      if (paramsForSse) {
        for (const paramItem of paramsForSse) { // Renamed paramMeta to paramItem again for consistency
          if (paramItem.type === ParameterType.BODY) {
            suggestions.push({
              severity: 'warning', // Warning, as POST to initiate SSE with a body is possible but less common for event streaming part
              message: `Method '${methodName}' is an SSE handler (decorated with @sse) and uses @Body(). While an initial POST request to establish an SSE connection can have a body, ensure this is intended for setup, as SSE handlers primarily stream data to the client. Query or path parameters are more common for initial SSE setup if it's a GET request.`,
              className,
              methodName,
              parameterIndex: paramItem.index,
              decoratorInvolved: '@Body()',
              keyInvolved: `parameter[${paramItem.index}]`,
              expectedPattern: 'Typically no @Body() for SSE data streaming, or used only for initial POST setup.',
              actualPattern: '@Body() found on parameter.',
              suggestionCode: 'DAWAI-VAL-SSE001' // Example code for: SSE with Body
            });
          }
        }
      }
    }

    let actualParamCount = -1; // Default to -1 if reflection fails or not applicable
    if (methodHasSchema) {
      // --- New Parameter Count Heuristic Check ---
      if (serviceClass.prototype && typeof serviceClass.prototype[methodName] === 'function') {
        const designParamTypes = Reflect.getMetadata('design:paramtypes', serviceClass.prototype, methodName);
        if (designParamTypes) { // designParamTypes can be undefined if no params or no type info
          actualParamCount = designParamTypes.length;
        } else if (typeof serviceClass.prototype[methodName] === 'function' && serviceClass.prototype[methodName].length === 0) {
          // Fallback for functions with zero parameters where design:paramtypes might be undefined
          actualParamCount = 0;
        }
      }

      if (actualParamCount === 0) {
        suggestions.push({
          severity: 'warning',
          message: `Method '${methodName}' is decorated with ${decoratorNameWithSchema} and defines a data schema, but the method signature has zero parameters. To utilize this schema for data input, consider adding a parameter decorated with an appropriate data injection decorator (e.g., @Body(), @Query(), @Params()).`,
          className,
          methodName,
          decoratorInvolved: decoratorNameWithSchema,
          keyInvolved: 'methodParameters',
          expectedPattern: 'One or more parameters, with at least one for schema data injection (e.g., using @Body()).',
          actualPattern: 'Zero parameters defined in method signature.',
          suggestionCode: 'DAWAI-VAL-SCHEMA001'
        });
      }
    } else if (actualParamCount > 0) {
      // This branch handles methods that have a schema and > 0 parameters.
      // Now check if any of these parameters actively use the schema via relevant decorators.
      const parameterMetadatas = metadataStorage.getParameterMetadata(serviceClass, methodName);
      const relevantDataInjectionDecorators = [
        ParameterType.BODY,
        ParameterType.QUERY,
        ParameterType.PARAMS
      ];
      const schemaIsActivelyInjected = parameterMetadatas?.some(p =>
        relevantDataInjectionDecorators.includes(p.type)
      );

      if (!schemaIsActivelyInjected) {
        suggestions.push({
          severity: 'warning',
          message: `Method '${methodName}' has a schema defined via ${decoratorNameWithSchema}, but no parameters are decorated with @Body(), @Query(), or @Params() to inject this data. Ensure the schema is utilized for data injection if intended.`,
          className,
          methodName,
          decoratorInvolved: decoratorNameWithSchema,
          keyInvolved: 'parameterDecorators',
          expectedPattern: 'At least one parameter decorated with @Body(), @Query(), or @Params().',
          actualPattern: 'No parameters found with @Body(), @Query(), or @Params() decorators.',
          suggestionCode: 'DAWAI-VAL-SCHEMA002'
        });
      }
    }
    // The old "schema but no @Body()" check is now removed / subsumed by the logic above.

    // Check for @Body() on HTTP GET/DELETE methods decorated with @crud
    if (methodMeta.crud && (methodMeta.crud.method === 'GET' || methodMeta.crud.method === 'DELETE')) {
      const httpMethod = methodMeta.crud.method; // 'GET' or 'DELETE'
      const paramsForCrud = metadataStorage.getParameterMetadata(serviceClass, methodName);
      if (paramsForCrud) {
        for (const paramItem of paramsForCrud) { // Renamed paramMeta to paramItem to avoid conflict
          if (paramItem.type === ParameterType.BODY) {
            suggestions.push({
              severity: 'error',
              message: `Method '${methodName}' is an HTTP ${httpMethod} handler via @crud, which should not have a @Body() parameter. HTTP ${httpMethod} requests typically do not have a message body.`,
              className,
              methodName,
              parameterIndex: paramItem.index,
              decoratorInvolved: '@Body()',
              keyInvolved: `parameter[${paramItem.index}]`, // Or more descriptive parameter name if available
              expectedPattern: `No @Body() for HTTP ${httpMethod}`,
              actualPattern: '@Body() found on parameter.',
              suggestionCode: 'DAWAI-VAL-HTTP001' // Example code for: HTTP GET/DELETE with Body
            });
          }
        }
      }
    }
  }

  // TODO: Add more checks:
  // - Parameter decorator specific checks (e.g., @Param without a key if not on HTTP transport)
  // - Check for unknown decorators if feasible
  
  return suggestions;
}
