/**
 * Input Sanitization & XSS Prevention Utility
 * Sanitizes user input and prevents prompt injection for AI operations.
 */

/**
 * Escapes unsafe HTML characters to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strips dangerous injection keywords from AI prompts
 */
export function sanitizeAiPrompt(prompt: string): string {
  if (!prompt) return '';
  
  // Remove known system override attempts
  const suspiciousPatterns = [
    /ignore previous instructions/gi,
    /system prompt/gi,
    /you are now a/gi,
    /override system/gi,
    /reveal key/gi,
    /bypass rules/gi,
  ];

  let cleaned = prompt;
  for (const pattern of suspiciousPatterns) {
    cleaned = cleaned.replace(pattern, '[filtered]');
  }

  return cleaned.trim().slice(0, 2000); // Enforce max length
}
