import { TransportType } from '../constants';
import { StdioOptions } from './stdio.options.interface';
import { WebserviceOptions } from './webservice.options.interface';

export interface McpClientOptions {
  enabled: boolean;
  transport?: TransportType;
  options?: McpClientInnerOptions;
}

export interface McpClientInnerOptions {
  registry: () => Promise<any> | any;
  stdioOptions?: StdioOptions;
  webserviceOptions?: WebserviceOptions;
}
