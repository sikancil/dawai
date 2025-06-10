/**
 * Enum representing the different transport mechanisms or interaction protocols
 * supported by the DAWAI framework. These types help categorize how services
 * and handlers communicate and are discovered.
 */
export enum TransportType {
  /**
   * General category for HTTP-based interactions, including REST APIs.
   */
  WEBSERVICE = 'WEBSERVICE',

  /**
   * Standard Input/Output, typically used for Command Line Interfaces.
   */
  STDIO = 'STDIO',
}

export enum TransportFeature {
  /**
   * Specific type for Create, Read, Update, Delete operations, usually over HTTP.
   * Note: This might be refined to be a decoratorKey under WEBSERVICE.
   */
  CRUD = 'CRUD',

  /**
   * Bidirectional communication over a single, long-lived TCP connection,
   * commonly used for real-time web applications.
   */
  WEBSOCKET = 'WEBSOCKET',

  /**
   * Server-Sent Events, a standard for enabling a web server to push
   * event notifications to a web browser over HTTP.
   */
  SSE = 'SSE',

  /**
   * Remote Procedure Call, a protocol that one program can use to request
   * a service from a program located in another computer on a network.
   */
  RPC = 'RPC',

  /**
   * Model Context Protocol, for structured communication with AI models or agents.
   */
  MCP = 'MCP',

  /**
   * Agent-to-Agent Protocol, for direct communication between autonomous agents.
   */
  A2A = 'A2A',

  /**
   * Large Language Model tool interaction, a specialized form of communication
   * often involving structured inputs and outputs for AI model tools.
   */
  LLM = 'LLM',

  /**
   * Explicitly for Command Line Interface interactions.
   * NOTE: May overlap with STDIO; refinement might be needed based on usage.
   */
  CLI = 'CLI',
}
