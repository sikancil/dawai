import { NextFunction, Request, Response } from 'express';
import WebSocket from 'ws';

/**
 * Defines the context object available in web service handlers.
 * It typically includes the Express request and response objects,
 * and can be extended with other service-specific properties.
 */
export interface WebServiceContext {
  /**
   * The Express Request object.
   */
  req: Request;

  /**
   * The Express Response object.
   */
  res: Response;

  /**
   * The Next function for middleware chaining.
   * It is used to pass control to the next middleware function.
   */
  next?: NextFunction;

  /**
   * The WebSocket client instance, for WebSocket contexts.
   * This is typically available when handling WebSocket messages.
   */
  ws?: WebSocket;

  /**
   * The event name for a WebSocket message, for WebSocket contexts.
   * This helps identify the type of WebSocket message received.
   */
  eventName?: string;

  /**
   * The data payload of a WebSocket message, for WebSocket contexts.
   * This contains the actual data sent by the client.
   */
  messageData?: any;

  // Add other web service-specific context properties here if needed.
  // For example:
  // user?: any; // Information about the authenticated user
  // sessionId?: string; // Session identifier
}
