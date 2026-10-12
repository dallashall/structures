/**
 * UUID generation utility
 * Generates RFC4122 version 4 compliant UUIDs
 */

/**
 * Generate a UUID v4 (random)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
// 'y' takes the RFC 4122 variant bits (10xx)
const toRandomHexDigit = (placeholder: string): string => {
  const r = (Math.random() * 16) | 0;
  const v = placeholder === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
};

export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, toRandomHexDigit);
}
