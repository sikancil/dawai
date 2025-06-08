import { ParameterType } from '@arifwidianto/dawai-common';

export interface ParameterDecoratorMetadata {
  index: number; // Parameter index in the method signature
  type: ParameterType;
  key?: string; // e.g., for @Params('id') or @Query('name')
  // schema?: ZodSchema<any>; // Placeholder for future validation
}
