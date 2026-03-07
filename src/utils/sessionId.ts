/**
 * Session ID management
 * Generates and maintains a unique session ID for the current browser session
 */

import { generateUUID } from './uuid';

// Session ID is generated once per browser session and cached
let sessionId: string | null = null;

/**
 * Get the current session ID
 * Generates a new session ID if one doesn't exist
 */
export function getSessionId(): string {
  if (!sessionId) {
    sessionId = generateUUID();
  }
  return sessionId;
}

/**
 * Reset the session ID (useful for testing)
 */
export function resetSessionId(): void {
  sessionId = null;
}
