// packages/protocol-core/src/interfaces.ts
export interface IMCPMessage {
  type: 'request' | 'response' | 'event' | 'error';
  id: string; // Correlation ID for request-response pairing
  sender: string;
  recipient: string;
  timestamp: number;
  payload: any; // Can be further typed based on message type
}

export interface IMCPRequestPayload {
  method: string;
  args: any[];
  context?: any; // Additional context for the method call
}

export interface IMCPMethod {
  name: string;
  description: string;
  parameters: { [key: string]: string }; // Basic type hints, e.g., { "arg1": "number", "arg2": "string" }
}

// For A2A interfaces, as the PRD provides no specific structure beyond placeholders,
// define them as empty interfaces for now.
export interface IA2AMessage {
  // A2A specific message structure (currently undefined in PRD example for Epic 2)
}

export interface IA2AMethod {
  // A2A specific method structure (currently undefined in PRD example for Epic 2)
}
