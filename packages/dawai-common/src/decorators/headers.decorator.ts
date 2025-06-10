import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects request headers into the decorated parameter.
 * If a headerName is provided, injects the specific header value.
 * If no headerName is provided, injects an object containing all request headers.
 *
 * @param headerName Optional. The name of the HTTP header to inject (e.g., 'Authorization').
 *                   Header names are typically case-insensitive, but the exact behavior
 *                   might depend on the underlying transport adapter.
 *
 * @example
 * ```typescript
 * class MyController {
 *   getAuthToken(@Headers('Authorization') token: string, @Headers() allHeaders: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Headers(headerName?: string): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.HEADERS,
      headerName
    );
  };
}
