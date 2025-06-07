export enum ParameterType {
  BODY,
  PARAMS,
  QUERY,
  HEADERS,
  COOKIES,
  SESSION,
  FILES,
  CTX,
  REQ,
  RES
}

export interface ParameterDecoratorMetadata {
  index: number; // Parameter index in the method signature
  type: ParameterType;
  key?: string; // e.g., for @Params('id') or @Query('name')
  // schema?: ZodSchema<any>; // Placeholder for future validation
}
