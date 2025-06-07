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
      const parameterMetadatas = metadataStorage.getParameterMetadata(serviceClass, methodName);
      const hasBodyParam = parameterMetadatas?.some(p => p.type === ParameterType.BODY);

      if (!hasBodyParam) {
        suggestions.push({
          severity: 'warning',
          message: `Method '${methodName}' is decorated with ${decoratorNameWithSchema} which includes a schema, but no @Body() parameter was found to receive the schema-validated payload.`,
          className,
          methodName,
        });
      }
    }

    // TODO: Add more checks:
    // - Parameter decorator specific checks (e.g., @Param without a key if not on HTTP transport)
    // - Check for unknown decorators if feasible
  }

  return suggestions;
}
