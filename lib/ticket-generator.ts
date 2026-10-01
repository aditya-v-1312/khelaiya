import crypto from 'crypto';

/**
 * Generates an opaque, cryptographically random Ticket ID.
 * Format: NUV-KHL-XXXXXXXXXX (e.g. NUV-KHL-X7F92KLMQ4)
 * Contains zero personal details or attendee data.
 */
export function generateTicketId(): string {
  // Use character set without ambiguous characters (0, O, 1, I)
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const length = 10;
  
  let randomStr = '';
  // Generate cryptographically secure random bytes
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    randomStr += charset[byte % charset.length];
  }
  
  return `NUV-KHL-${randomStr}`;
}

/**
 * Validates whether a scanned QR string matches the expected Ticket ID format.
 */
export function isValidTicketIdFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  return /^NUV-KHL-[A-Z0-9]{8,12}$/i.test(trimmed);
}
