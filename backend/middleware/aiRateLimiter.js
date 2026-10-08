const rateLimit = require('express-rate-limit');

/**
 * Rate limiter spécifique pour les appels IA.
 * 10 requêtes / minute / utilisateur.
 * Basé sur l'ID utilisateur (pas l'IP) pour un rate limit par compte.
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => {
    // Rate limit par utilisateur authentifié
    return req.user?._id?.toString() || req.ip;
  },
  validate: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de requêtes IA. Veuillez patienter une minute.',
  },
  standardHeaders: true, // Retourne les headers RateLimit-*
  legacyHeaders: false,
});

module.exports = aiRateLimiter;
