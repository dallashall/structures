// Fills the v4 template. 'y' takes the RFC 4122 variant bits (10xx).
const toRandomHexDigit = (placeholder: string): string => {
  const r = (Math.random() * 16) | 0;
  const v = placeholder === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
};

export function generateUUID(): string {
  // crypto.randomUUID exists only in secure contexts, so a page served over plain HTTP lacks it
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, toRandomHexDigit);
}
