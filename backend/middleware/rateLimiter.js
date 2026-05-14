import rateLimit from 'express-rate-limit';

// AI endpoints: 20 requests per user per hour
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req.user ? String(req.user.id || req.user.email) : req.ip),
  message: { error: 'Too many AI requests. Limit is 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General endpoints: 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Limit is 100 per 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
