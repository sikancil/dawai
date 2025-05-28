// dawai-framework/packages/dawai-microservice/src/lib/transports/interfaces.ts
export interface ITransportAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
}
