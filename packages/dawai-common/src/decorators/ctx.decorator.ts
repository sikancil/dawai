import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects a context object into the decorated parameter.
 * The context object can hold request-specific or application-wide information.
 *
 * @example
 * ```typescript
 * class MyController {
 *   getContextInfo(@Ctx() context: IAppContext) {
 *     // ... use context
 *   }
 * }
 * ```
 */
export function Ctx(): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.CTX,
      undefined // No key needed for Ctx
    );
  };
}
