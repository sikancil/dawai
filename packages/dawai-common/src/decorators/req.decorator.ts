import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects the raw request object from the underlying transport layer
 * (e.g., Express Request, Node.js http.IncomingMessage) into the decorated parameter.
 * Use this when you need direct access to the native request object.
 *
 * @example
 * ```typescript
 * import { Request as ExpressRequest } from 'express';
 *
 * class MyController {
 *   getRawRequest(@Req() req: ExpressRequest) {
 *     // Access native request properties, e.g., req.ip
 *   }
 * }
 * ```
 */
export function Req(): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.REQUEST,
      undefined // No key needed for Req
    );
  };
}
