import "reflect-metadata";
import type {
  Microservice,
  MethodRegistryEntry,
  MethodHandler,
  DecoratorMetadata,
} from "../microservice.js";
import {
  LLM_TOOL_METADATA_KEY,
  MCP_METHOD_METADATA_KEY,
  A2A_METHOD_METADATA_KEY,
  REST_ENDPOINT_METADATA_KEY,
} from "../decorators/constants.js";
import type {
  LLMToolOptions,
  MCPMethodOptions,
  A2AMethodOptions,
  RestEndpointOptions,
} from "../decorators/method-decorators.js";

export function discoverAndRegisterMethods(
  serviceInstance: object,
  microservice: Microservice
): void {
  if (typeof serviceInstance !== "object" || serviceInstance === null) {
    console.warn("discoverAndRegisterMethods: serviceInstance must be a valid non-null object.");
    return;
  }
  if (
    !(microservice instanceof Object) ||
    typeof microservice._registerMethodEntry !== "function"
  ) {
    console.warn(
      "discoverAndRegisterMethods: microservice instance is invalid or does not have _registerMethodEntry function."
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const prototype: object | null = Object.getPrototypeOf(serviceInstance);

  if (prototype === null) {
    console.warn(
      "discoverAndRegisterMethods: Could not get a prototype of serviceInstance (it is null)."
    );
    return;
  }

  if (prototype === Object.prototype) {
    console.warn(
      "discoverAndRegisterMethods: Prototype of serviceInstance is Object.prototype, no user-defined methods to discover."
    );
    return;
  }
  const actualPrototype: object = prototype; // This is safe due to the checks above

  Object.getOwnPropertyNames(actualPrototype).forEach((propertyName) => {
    if (propertyName === "constructor") {
      return;
    }

    const propertyValue = (actualPrototype as Record<string, unknown>)[propertyName];

    if (typeof propertyValue === "function") {
      const method = propertyValue as MethodHandler;
      const compiledDecorators: DecoratorMetadata = {}; // Changed to const
      let hasMetadata = false;

      const llmToolOpts = Reflect.getMetadata(
        LLM_TOOL_METADATA_KEY,
        actualPrototype,
        propertyName
      ) as LLMToolOptions | undefined;
      if (llmToolOpts) {
        compiledDecorators.llmTool = llmToolOpts;
        hasMetadata = true;
      }

      const mcpMethodOpts = Reflect.getMetadata(
        MCP_METHOD_METADATA_KEY,
        actualPrototype,
        propertyName
      ) as MCPMethodOptions | undefined;
      if (mcpMethodOpts) {
        compiledDecorators.mcpMethod = mcpMethodOpts;
        hasMetadata = true;
      }

      const a2aMethodOpts = Reflect.getMetadata(
        A2A_METHOD_METADATA_KEY,
        actualPrototype,
        propertyName
      ) as A2AMethodOptions | undefined;
      if (a2aMethodOpts) {
        compiledDecorators.a2aMethod = a2aMethodOpts;
        hasMetadata = true;
      }

      const restEndpointOpts = Reflect.getMetadata(
        REST_ENDPOINT_METADATA_KEY,
        actualPrototype,
        propertyName
      ) as RestEndpointOptions | undefined;
      if (restEndpointOpts) {
        compiledDecorators.restEndpoint = restEndpointOpts;
        hasMetadata = true;
      }

      if (hasMetadata) {
        const entry: MethodRegistryEntry = {
          name: propertyName,
          handler: method.bind(serviceInstance),
          decorators: compiledDecorators,
        };

        microservice._registerMethodEntry(entry);
      }
    }
  });
}
