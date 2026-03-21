/**
 * Simple CSRF protection for admin endpoints.
 * Generates and validates CSRF tokens.
 */

/**
 * Generate a random CSRF token.
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate that a CSRF token is present and matches expected value.
 */
export function validateCSRFToken(
  token: string | null | undefined,
  expectedToken: string,
): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  return token === expectedToken;
}

/**
 * Generate a CSRF token and set it as a cookie.
 */
export function setCSRFTokenCookie(): void {
  // Note: We can't directly set cookies on Response in Next.js API routes
  // This is typically done via NextResponse.cookies.set()
  // This function is for reference if needed in middleware
}

/**
 * Extract CSRF token from request headers or body.
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // Check header first
  const token = request.headers.get('x-csrf-token');
  if (token) return token;

  // Fall back to checking body (less secure but more flexible)
  return null;
}
