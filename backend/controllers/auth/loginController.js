const mongoose = require('mongoose');
const User = require('../../models/User');
const OrganizationSettings = require('../../models/OrganizationSettings');
const ErrorResponse = require('../../utils/errorResponse');
const { sendTokenResponse } = require('./utils');

const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_UNKNOWN_STORE_SIZE = 5000;

// In-memory fallback map for unknown usernames keyed by `${lowercaseUsername}|${ip}`
const unknownAttemptStore = new Map();

const pruneUnknownAttempts = (now) => {
  for (const [key, entry] of unknownAttemptStore.entries()) {
    if (entry.lockUntil && entry.lockUntil <= now) {
      unknownAttemptStore.delete(key);
    } else if (!entry.lockUntil && now - entry.updatedAt > LOCKOUT_DURATION_MS) {
      unknownAttemptStore.delete(key);
    }
  }
  while (unknownAttemptStore.size > MAX_UNKNOWN_STORE_SIZE) {
    const oldestKey = unknownAttemptStore.keys().next().value;
    if (oldestKey === undefined) break;
    unknownAttemptStore.delete(oldestKey);
  }
};

const resolveMaxLoginAttempts = async () => {
  try {
    const settings = await OrganizationSettings.findOne().select('maxLoginAttempts').lean();
    const configured = Number(settings?.maxLoginAttempts);
    if (Number.isInteger(configured) && configured >= 1 && configured <= 50) {
      return configured;
    }
  } catch (_err) {
    // Fallback safely to default if settings lookup fails
  }
  return DEFAULT_MAX_LOGIN_ATTEMPTS;
};

const buildLockoutResponse = (maxAttempts, lockUntilMs) => ({
  success: false,
  locked: true,
  attempts: maxAttempts,
  maxAttempts,
  remainingAttempts: 0,
  lockUntil: new Date(lockUntilMs).toISOString(),
  message: 'Account temporarily locked due to too many failed login attempts',
  error: 'Account temporarily locked due to too many failed login attempts'
});

const buildInvalidAttemptResponse = (attempts, maxAttempts) => ({
  success: false,
  locked: false,
  attempts,
  maxAttempts,
  remainingAttempts: Math.max(0, maxAttempts - attempts),
  message: 'Invalid credentials',
  error: 'Invalid credentials'
});

exports.__resetUnknownAttempts = () => {
  unknownAttemptStore.clear();
};

exports.LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MS;

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const username = req.body?.username;
    const password = req.body?.password;

    // Strict type validation to prevent NoSQL injection
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid credentials format', error: 'Invalid credentials format' });
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      return next(new ErrorResponse('Please provide username and password', 400));
    }

    if (username.length > 100 || password.length > 200) {
      return res.status(400).json({ success: false, message: 'Invalid credentials format', error: 'Invalid credentials format' });
    }

    // Refuse authentication with 503 when MongoDB is unavailable
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Service temporairement indisponible (base de données hors ligne)',
        error: 'Service temporairement indisponible (base de données hors ligne)'
      });
    }

    const maxAttempts = await resolveMaxLoginAttempts();
    const now = Date.now();
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const unknownKey = `${trimmedUsername.toLowerCase()}|${clientIp}`;

    // Check for user in database
    let user;
    try {
      user = await User.findOne({ username: trimmedUsername }).select('+password');
    } catch (_dbErr) {
      return res.status(503).json({
        success: false,
        message: 'Service temporairement indisponible (base de données hors ligne)',
        error: 'Service temporairement indisponible (base de données hors ligne)'
      });
    }

    // Unknown username: track attempts in-memory by lowercase username + IP without leaking existence
    if (!user) {
      pruneUnknownAttempts(now);
      const existing = unknownAttemptStore.get(unknownKey);

      if (existing && existing.lockUntil && existing.lockUntil > now) {
        return res.status(423).json(buildLockoutResponse(maxAttempts, existing.lockUntil));
      }

      const previousAttempts = existing && !existing.lockUntil ? existing.attempts : 0;
      const nextAttempts = previousAttempts + 1;

      if (nextAttempts >= maxAttempts) {
        const lockUntilMs = now + LOCKOUT_DURATION_MS;
        unknownAttemptStore.set(unknownKey, {
          attempts: maxAttempts,
          lockUntil: lockUntilMs,
          updatedAt: now
        });
        return res.status(423).json(buildLockoutResponse(maxAttempts, lockUntilMs));
      }

      unknownAttemptStore.set(unknownKey, {
        attempts: nextAttempts,
        lockUntil: null,
        updatedAt: now
      });
      return res.status(401).json(buildInvalidAttemptResponse(nextAttempts, maxAttempts));
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
        error: 'Your account has been deactivated'
      });
    }

    // Check active lockout FIRST (even if the correct password is entered)
    const existingLockUntilMs = user.lockUntil ? new Date(user.lockUntil).getTime() : 0;
    if (existingLockUntilMs > now) {
      return res.status(423).json(buildLockoutResponse(maxAttempts, existingLockUntilMs));
    }

    // Clear expired lockout baseline if lockUntil has elapsed
    const currentAttempts =
      existingLockUntilMs > 0 && existingLockUntilMs <= now
        ? 0
        : Math.max(0, Number(user.failedLoginAttempts) || 0);

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      const nextAttempts = currentAttempts + 1;

      if (nextAttempts >= maxAttempts) {
        const lockUntilMs = now + LOCKOUT_DURATION_MS;
        await User.updateOne(
          { _id: user._id },
          { $set: { failedLoginAttempts: maxAttempts, lockUntil: new Date(lockUntilMs) } }
        );
        return res.status(423).json(buildLockoutResponse(maxAttempts, lockUntilMs));
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: nextAttempts, lockUntil: null } }
      );
      return res.status(401).json(buildInvalidAttemptResponse(nextAttempts, maxAttempts));
    }

    // Valid password while not locked: reset failed login counters
    if ((user.failedLoginAttempts || 0) > 0 || user.lockUntil) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0, lockUntil: null } }
      );
    }
    unknownAttemptStore.delete(unknownKey);

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err.message || err);
    next(err);
  }
};
