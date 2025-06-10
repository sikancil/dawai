export interface DawaiMiddleware {
  use(context: any, next: () => Promise<any>): Promise<any>;
}

export type MiddlewareType = { new (...args: any[]): DawaiMiddleware } | DawaiMiddleware;
