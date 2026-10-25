/**
 * Reelsidian Security Middleware
 * Production-grade security headers, sliding-window rate limiting, and input sanitization.
 */

const { RATE_LIMITS } = require('../config/constants');

// ==========================================
// 1. HTTP Security Headers
// ==========================================
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  
  // Disable powered-by disclosure
  res.removeHeader('X-Powered-By');
  next();
}

// ==========================================
// 2. In-Memory Sliding-Window Rate Limiter
// ==========================================
class SlidingWindowRateLimiter {
  constructor(windowMs, maxRequests, bucketName = 'default') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.bucketName = bucketName;
    this.hits = new Map(); // ip -> Array of timestamps

    // Periodically clean up stale records every 3 minutes
    setInterval(() => this.cleanup(), 3 * 60 * 1000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.hits.entries()) {
      const active = timestamps.filter((t) => now - t < this.windowMs);
      if (active.length === 0) {
        this.hits.delete(ip);
      } else {
        this.hits.set(ip, active);
      }
    }
  }

  getIp(req) {
    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  middleware() {
    return (req, res, next) => {
      const ip = this.getIp(req);
      const now = Date.now();
      const userHits = (this.hits.get(ip) || []).filter((t) => now - t < this.windowMs);

      if (userHits.length >= this.maxRequests) {
        const retryAfterSeconds = Math.ceil((this.windowMs - (now - userHits[0])) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil((userHits[0] + this.windowMs) / 1000));

        return res.status(429).json({
          error: 'Rate limit exceeded. Please wait a moment before sending another request.',
          retryAfterSeconds
        });
      }

      userHits.push(now);
      this.hits.set(ip, userHits);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - userHits.length));

      next();
    };
  }
}

// Pre-configured rate limiters
const heavyProcessingLimiter = new SlidingWindowRateLimiter(
  RATE_LIMITS.WINDOW_MS,
  RATE_LIMITS.MAX_HEAVY_REQUESTS,
  'ai-processing'
).middleware();

const generalApiLimiter = new SlidingWindowRateLimiter(
  RATE_LIMITS.WINDOW_MS,
  RATE_LIMITS.MAX_GENERAL_REQUESTS,
  'general-api'
).middleware();

// ==========================================
// 3. Input Sanitization Helpers
// ==========================================
function sanitizeText(str, maxLength = 8000) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function sanitizeCreator(str) {
  if (typeof str !== 'string') return 'creator';
  // Allow alphanumeric, underscores, dots, and hyphens (standard Instagram & YouTube handles)
  const cleaned = str.replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '').trim();
  return cleaned.slice(0, 50) || 'creator';
}

function sanitizeUrl(str) {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href.slice(0, 1000);
    }
  } catch (e) {
    // invalid URL format
  }
  return '';
}

module.exports = {
  securityHeaders,
  heavyProcessingLimiter,
  generalApiLimiter,
  sanitizeText,
  sanitizeCreator,
  sanitizeUrl
};
