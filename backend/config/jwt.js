const MIN_JWT_SECRET_LENGTH = 32;
const DEFAULT_JWT_EXPIRE = '8h';
const DEFAULT_JWT_COOKIE_EXPIRE_MS = 8 * 60 * 60 * 1000; // 8 heures

/**
 * Valide JWT_SECRET (sans jamais afficher sa valeur).
 * En production comme hors production : absent ou < 32 caractères => arrêt immédiat (exit 1).
 */
function validateJwtConfig() {
  const secret = process.env.JWT_SECRET;

  if (!secret || typeof secret !== 'string' || secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    const reason =
      !secret || typeof secret !== 'string' || secret.trim().length === 0
        ? 'absent ou vide'
        : `trop court (${secret.trim().length} caractères ; minimum requis : ${MIN_JWT_SECRET_LENGTH})`;

    console.error(`🔴 FATAL: JWT_SECRET invalide (${reason}). Aucun secret de repli autorisé.`);
    console.error('   Générer un secret fort : node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  }

  return secret;
}

/**
 * Retourne JWT_SECRET validé (sans secret de repli).
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `Configuration JWT invalide : JWT_SECRET absent ou inférieur à ${MIN_JWT_SECRET_LENGTH} caractères.`
    );
  }
  return secret;
}

/**
 * Retourne la durée de validité du JWT (par défaut 8h).
 */
function getJwtExpire() {
  const expire = process.env.JWT_EXPIRE;
  if (typeof expire === 'string' && expire.trim().length > 0) {
    return expire.trim();
  }
  return DEFAULT_JWT_EXPIRE;
}

/**
 * Convertit une durée ('8h', '30m', '1d', '3600s', ou nombre de jours) en millisecondes.
 */
function parseDurationToMs(rawValue, fallbackMs) {
  if (rawValue === undefined || rawValue === null) {
    return fallbackMs;
  }

  const trimmed = String(rawValue).trim();
  if (!trimmed) {
    return fallbackMs;
  }

  const unitMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/i);
  if (unitMatch) {
    const amount = Number(unitMatch[1]);
    const unit = unitMatch[2].toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0) {
      return fallbackMs;
    }
    const multipliers = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return Math.floor(amount * multipliers[unit]);
  }

  // Rétrocompatibilité : valeur numérique pure exprimée en jours (ex. JWT_COOKIE_EXPIRE=1)
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const days = Number(trimmed);
    if (Number.isFinite(days) && days > 0) {
      return Math.floor(days * 24 * 60 * 60 * 1000);
    }
  }

  return fallbackMs;
}

/**
 * Retourne la durée du cookie JWT en millisecondes, alignée sur JWT_EXPIRE (8h par défaut).
 */
function getJwtCookieExpireMs() {
  const jwtExpireMs = parseDurationToMs(getJwtExpire(), DEFAULT_JWT_COOKIE_EXPIRE_MS);
  const rawCookieExpire = process.env.JWT_COOKIE_EXPIRE;
  if (rawCookieExpire !== undefined && String(rawCookieExpire).trim() !== '') {
    return parseDurationToMs(rawCookieExpire, jwtExpireMs);
  }
  return jwtExpireMs;
}

/**
 * Retourne les options sécurisées du cookie d'authentification.
 */
function getCookieOptions() {
  const maxAgeMs = getJwtCookieExpireMs();
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    expires: new Date(Date.now() + maxAgeMs),
    maxAge: maxAgeMs,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

module.exports = {
  MIN_JWT_SECRET_LENGTH,
  DEFAULT_JWT_EXPIRE,
  DEFAULT_JWT_COOKIE_EXPIRE_MS,
  validateJwtConfig,
  getJwtSecret,
  getJwtExpire,
  parseDurationToMs,
  getJwtCookieExpireMs,
  getCookieOptions,
};
