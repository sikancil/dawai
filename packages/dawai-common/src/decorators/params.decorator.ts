import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects URL path parameters into the decorated parameter.
 * If a paramName is provided, injects the specific path parameter value.
 * If no paramName is provided, injects an object containing all path parameters.
 *
 * @param paramName Optional. The name of the path parameter to inject (e.g., 'id' for '/users/:id').
 *
 * @example
 * ```typescript
 * class MyController {
 *   // For a route like /users/:userId/posts/:postId
 *   getItem(@Params('userId') userId: string, @Params('postId') postId: string) {
 *     // ...
 *   }
 *
 *   // To get all params as an object
 *   getAll(@Params() allPathParams: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Params(paramName?: string): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.PARAM, // Note: TASK_006 defined PARAM for single URL segments
                           // and PARAMS for CLI flags. This decorator is for URL segments.
      paramName
    );
  };
}
