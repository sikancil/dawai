export abstract class TransportAdapter {
  abstract initialize(options: any): Promise<void>;
  abstract listen(): Promise<void>;
  abstract close(): Promise<void>;
  abstract registerHandler(methodName: string, metadata: any, handlerFn: Function, serviceInstance: any): void;
}
