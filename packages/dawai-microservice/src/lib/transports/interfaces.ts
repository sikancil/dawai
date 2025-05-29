export interface ITransportAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
}
