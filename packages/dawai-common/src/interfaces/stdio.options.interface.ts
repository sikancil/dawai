export interface StdioOptions {
  enabled: boolean;
  options?: {
    interactive?: boolean;
    prompt?: string;
  };
}