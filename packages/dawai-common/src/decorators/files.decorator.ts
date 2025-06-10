import { metadataStorage } from '../metadata.storage';
import { ParameterType } from '../constants';

/**
 * Injects uploaded files into the decorated parameter.
 * If a fieldName is provided, injects the specific file(s) associated with that field.
 * If no fieldName is provided, injects all uploaded files (behavior might vary by adapter,
 * e.g., an array of files or an object mapping field names to files).
 *
 * @param fieldName Optional. The name of the form field for the file(s).
 *
 * @example
 * ```typescript
 * class MyController {
 *   uploadAvatar(@Files('avatar') avatar: UploadedFile, @Files() allFiles: any) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Files(fieldName?: string): ParameterDecorator {
  return function (target: Object, methodName: string | symbol | undefined, index: number) {
    if (methodName === undefined) {
      // Primarily for method parameters
      return;
    }
    metadataStorage.addParameterMetadata(
      target.constructor,
      methodName as string,
      index,
      ParameterType.FILES,
      fieldName
    );
  };
}
