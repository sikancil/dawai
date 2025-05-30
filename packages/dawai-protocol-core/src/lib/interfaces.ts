export interface IMCPMessage {
  type: "request" | "response" | "event" | "error";
  id: string; // Correlation ID for request-response pairing
  sender: string;
  recipient: string;
  timestamp: number;
  payload: unknown; // Can be further typed based on message type
}

export interface IMCPRequestPayload {
  method: string;
  args: unknown[];
  context?: unknown; // Additional context for the method call
}

export interface IMCPMethod {
  name: string;
  description: string;
  parameters: { [key: string]: string }; // Basic type hints, e.g., { "arg1": "number", "arg2": "string" }
}

// For A2A interfaces, as the PRD provides no specific structure beyond placeholders,
// define them as empty interfaces for now.
export type IA2AMessage = Record<string, unknown>;
// export type IA2AMessage = Record<string, never>;

export type IA2AMethod = Record<string, unknown>;
// export type IA2AMethod  = Record<string, never>;
