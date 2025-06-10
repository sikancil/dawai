import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects query parameters from the URL into the decorated parameter.
 * If a key is provided, injects the specific query parameter value.
 * If no key is provided, injects an object containing all query parameters.
 *
 * @param key Optional. The name of the query parameter to inject.
 *
 * @example
 * ```typescript
 * class MyController {
 *   findItems(@Query('search') searchTerm: string, @Query() allParams: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Query(key?: string): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.QUERY,
      key
    );
  };
}
