import "reflect-metadata"; // Ensure it's imported here if not globally available yet in this context
import {
  LLM_TOOL_METADATA_KEY,
  MCP_METHOD_METADATA_KEY,
  A2A_METHOD_METADATA_KEY,
  REST_ENDPOINT_METADATA_KEY,
} from "./constants.js";

export interface LLMToolOptions {
  name: string;
  description: string;
}
export function llmTool(
  options: LLMToolOptions
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void {
    Reflect.defineMetadata(LLM_TOOL_METADATA_KEY, options, target, propertyKey);
  };
}

export interface MCPMethodOptions {
  name: string;
  description: string;
}
export function mcpMethod(
  options: MCPMethodOptions
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void {
    Reflect.defineMetadata(MCP_METHOD_METADATA_KEY, options, target, propertyKey);
  };
}

export interface A2AMethodOptions {
  name: string;
  description: string;
}
export function a2aMethod(
  options: A2AMethodOptions
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void {
    Reflect.defineMetadata(A2A_METHOD_METADATA_KEY, options, target, propertyKey);
  };
}

export interface RestEndpointOptions {
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description?: string;
}
export function restEndpoint(
  options: RestEndpointOptions
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void {
    Reflect.defineMetadata(REST_ENDPOINT_METADATA_KEY, options, target, propertyKey);
  };
}
