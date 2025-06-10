import { TransportType } from '../constants';
import { StdioOptions } from './stdio.options.interface';
import { WebserviceOptions } from './webservice.options.interface';

export interface A2aAgentOptions {
  enabled: boolean;
  transport?: TransportType; // Changed to use TransportType enum and made optional
  details?: A2aAgentDetails; // Renamed from 'options'
  options?: A2aAgentTransportOptions; // New field for transport-specific options
}

export interface A2aAgentDetails {
  metadata: any;
}

export interface A2aAgentTransportOptions {
  stdioOptions?: StdioOptions;
  webserviceOptions?: WebserviceOptions;
}
