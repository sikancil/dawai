import { TransportType } from '../constants';
import { StdioOptions } from './stdio.options.interface';
import { WebserviceOptions } from './webservice.options.interface';

export interface McpServerOptions {
  enabled: boolean;
  transport?: TransportType; // Changed to use TransportType enum and made optional for consistency
  details?: McpServerDetails; // Renamed from 'options'
  options?: McpServerTransportOptions; // New field for transport-specific options
}

export interface McpServerDetails {
  name: string;
  description?: string;
  version?: string;
}

export interface McpServerTransportOptions {
  stdioOptions?: StdioOptions;
  webserviceOptions?: WebserviceOptions;
}
