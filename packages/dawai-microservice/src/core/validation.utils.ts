import { metadataStorage } from '../decorators/metadata.storage';
import { ParameterType } from '../decorators/parameter.options';
// Import relevant decorator option types if needed for deeper schema checks, for now, checking existence of 'schema' property is enough.
// import { McpDecoratorOptions, RpcDecoratorOptions, A2aDecoratorOptions, CliDecoratorOptions, CrudDecoratorOptions, WsDecoratorOptions, LlmDecoratorOptions } from '../decorator.options';

export interface ValidationSuggestion {
  severity: 'warning' | 'error' | 'info'; // For future use, default to 'warning'
  message: string;
  className: string;
  methodName?: string;
  parameterIndex?: number;
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

    if (methodHasSchema) {
      // --- New Parameter Count Heuristic Check ---
      let actualParamCount = -1; // Default to -1 if reflection fails or not applicable
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
            severity: 'warning', // Changed from 'info' to 'warning' for consistency
            message: `Method '${methodName}' has a schema defined via ${decoratorNameWithSchema}, but no parameters are decorated with @Body(), @Query(), or @Params() to inject this data. Ensure the schema is utilized for data injection if intended.`,
            className,
            methodName,
          });
        }
      }
      // The old "schema but no @Body()" check is now removed / subsumed by the logic above.
    }

    // TODO: Add more checks:
    // - Parameter decorator specific checks (e.g., @Param without a key if not on HTTP transport)
    // - Check for unknown decorators if feasible
  }

  return suggestions;
}
