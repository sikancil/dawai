import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects session data associated with the request into the decorated parameter.
 * The actual session management and data retrieval are handled by the
 * underlying transport adapter and session middleware.
 *
 * @example
 * ```typescript
 * class MyController {
 *   getUserSession(@Session() userSession: UserSessionData) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Session(): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.SESSION,
      undefined // No key needed for Session
    );
  };
}
