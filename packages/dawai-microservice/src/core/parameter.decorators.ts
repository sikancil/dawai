import { ParameterType, metadataStorage } from '@arifwidianto/dawai-common';

/**
 * Injects the main payload of the request/command.
 * - WebService: HTTP request body.
 * - Stdio: Object of all parsed CLI options.
 */
export function Body(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.BODY
      );
    }
  };
}

/**
 * Injects URL path parameters or specific CLI options.
 * @param key Optional key to extract a specific parameter/option. If omitted, injects all.
 */
export function Params(key?: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.PARAMS,
        key
      );
    }
  };
}

/**
 * Injects URL query parameters or specific CLI options (can be an alternative to Params for CLI).
 * @param key Optional key to extract a specific query parameter/option. If omitted, injects all.
 */
export function Query(key?: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.QUERY,
        key
      );
    }
  };
}

/**
 * Injects uploaded files.
 * - WebService: Files from multipart/form-data.
 * - Stdio: Files processed from '@' prefixed CLI arguments.
 */
export function Files(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.FILES
      );
    }
  };
}

/**
 * Injects request headers.
 * @param property Optional header name to extract a specific header. If omitted, injects all headers.
 */
export function Headers(property?: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.HEADERS,
        property
      );
    }
  };
}

/**
 * Injects parsed request cookies.
 * @param name Optional cookie name to extract a specific cookie. If omitted, injects all cookies.
 */
export function Cookies(name?: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.COOKIES,
        name
      );
    }
  };
}

/**
 * Injects session data.
 * @param name Optional session property name. If omitted, injects the whole session object.
 */
export function Session(name?: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.SESSION,
        name
      );
    }
  };
}

/**
 * Injects the raw request object (transport-specific).
 */
export function Req(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.REQUEST
      );
    }
  };
}

/**
 * Injects the raw response object (transport-specific).
 */
export function Res(): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (typeof propertyKey === 'string') {
      metadataStorage.addParameterMetadata(
        target.constructor,
        propertyKey,
        parameterIndex,
        ParameterType.RESPONSE
      );
    }
  };
}

// Note: @Ctx decorator is already implemented in ./decorators/ctx.decorator.ts
// and exported from the root of @arifwidianto/dawai-microservice.
// It also uses metadataStorage and ParameterType.CTX.
