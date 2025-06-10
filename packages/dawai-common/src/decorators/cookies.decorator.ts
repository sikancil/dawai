import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects cookie values into the decorated parameter.
 * If a cookieName is provided, injects the specific cookie value.
 * If no cookieName is provided, injects an object containing all cookies.
 *
 * @param cookieName Optional. The name of the cookie to inject.
 *
 * @example
 * ```typescript
 * class MyController {
 *   getSessionId(@Cookies('sessionId') sessionId: string, @Cookies() allCookies: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Cookies(cookieName?: string): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.COOKIES,
      cookieName
    );
  };
}
