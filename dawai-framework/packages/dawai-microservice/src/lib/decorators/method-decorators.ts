// dawai-framework/packages/dawai-microservice/src/lib/decorators/method-decorators.ts
import 'reflect-metadata'; // Ensure it's imported here if not globally available yet in this context
import { LLM_TOOL_METADATA_KEY, MCP_METHOD_METADATA_KEY, A2A_METHOD_METADATA_KEY, REST_ENDPOINT_METADATA_KEY } from './constants';

export interface LLMToolOptions { name: string; description: string; }
export function llmTool(options: LLMToolOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(LLM_TOOL_METADATA_KEY, options, target, propertyKey);
  };
}

export interface MCPMethodOptions { name: string; description: string; }
export function mcpMethod(options: MCPMethodOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(MCP_METHOD_METADATA_KEY, options, target, propertyKey);
  };
}

export interface A2AMethodOptions { name: string; description: string; }
export function a2aMethod(options: A2AMethodOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(A2A_METHOD_METADATA_KEY, options, target, propertyKey);
  };
}

export interface RestEndpointOptions { name: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; description?: string; }
export function restEndpoint(options: RestEndpointOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(REST_ENDPOINT_METADATA_KEY, options, target, propertyKey);
  };
}
