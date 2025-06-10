import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects the raw response object from the underlying transport layer
 * (e.g., Express Response, Node.js http.ServerResponse) into the decorated parameter.
 * Use this when you need direct access to the native response object, for example,
 * to set custom headers or end the response manually.
 *
 * @example
 * ```typescript
 * import { Response as ExpressResponse } from 'express';
 *
 * class MyController {
 *   sendCustomResponse(@Res() res: ExpressResponse) {
 *     res.status(201).send('Custom response');
 *   }
 * }
 * ```
 */
export function Res(): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.RESPONSE,
      undefined // No key needed for Res
    );
  };
}
