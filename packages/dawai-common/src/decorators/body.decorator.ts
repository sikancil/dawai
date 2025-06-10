import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects the request body into the decorated parameter.
 *
 * @example
 * ```typescript
 * class MyController {
 *   createUser(@Body('search') id: string, @Body() createParams: CreateUserDto) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Body(key?: string): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // This can happen if the decorator is applied to a constructor parameter,
      // which is not a typical use case for @Body but good to handle.
      // Or if used in a context where methodName is not available.
      // For now, we'll assume it's primarily for method parameters.
      // Consider throwing an error or logging if methodName is critical.
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.BODY,
      key
    );
  };
}
