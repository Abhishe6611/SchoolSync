/**
 * Real-time input sanitizers.
 * Each function takes the raw input value and returns a cleaned version
 * with disallowed characters stripped out instantly.
 */

/** Letters and spaces only (for names) */
export const sanitizeName = (v) => v.replace(/[^A-Za-z\s]/g, '');

/** Digits only (for phone numbers) */
export const sanitizeDigits = (v) => v.replace(/[^0-9]/g, '').slice(0, 10);

/** Valid email characters only */
export const sanitizeEmail = (v) => v.replace(/[^a-zA-Z0-9._%+\-@]/g, '');

/** Alphanumeric, hyphens, underscores (for codes like subject code, route no, vehicle no) */
export const sanitizeCode = (v) => v.replace(/[^A-Za-z0-9\-_]/g, '');

/** Alphanumeric + underscores only (for usernames) */
export const sanitizeUsername = (v) => v.replace(/[^a-zA-Z0-9_]/g, '');

/** Letters, numbers, spaces, and common punctuation (for general text like religion, nationality, occupation, qualification, address) */
export const sanitizeText = (v) => v.replace(/[^A-Za-z0-9\s.,'\-/()#&]/g, '');

/** Alphanumeric, spaces, hyphens (for route/vehicle numbers) */
export const sanitizeAlphaNumSpace = (v) => v.replace(/[^A-Za-z0-9\s\-]/g, '');
