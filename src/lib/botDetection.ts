/**
 * Simple bot detection to prevent automated content generation
 */
export function isLikelyBot(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false; // Server-side, let it proceed
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Common bot patterns
  const botPatterns = [
    'bot', 'crawl', 'spider', 'scraper', 'crawler',
    'curl', 'wget', 'python', 'http', 'java',
    'headless', 'phantom', 'selenium', 'puppeteer',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot',
    'baiduspider', 'yandexbot', 'sogou',
  ];

  return botPatterns.some(pattern => userAgent.includes(pattern));
}

export function hasUserInteraction(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for user interaction indicators
  return (
    window.innerWidth > 0 && window.innerHeight > 0 && // Browser window
    typeof window.outerWidth === 'number' && // Has window dimensions
    !isLikelyBot() // Not a known bot
  );
}
