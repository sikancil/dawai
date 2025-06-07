export abstract class TransportAdapter {
  abstract initialize(options: any): Promise<void>;
  abstract listen(): Promise<void>;
  abstract close(): Promise<void>;
  abstract registerHandler(handlerName: string, metadata: any): void; // Added handlerName for better context
}
