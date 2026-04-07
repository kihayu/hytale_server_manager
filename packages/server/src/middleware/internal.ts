import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';

/**
 * Middleware that guards /internal/* routes.
 *
 * Authentication strategy:
 * 1. If INTERNAL_SECRET is configured, validate the X-Internal-Secret header
 *    using constant-time comparison to prevent timing attacks.
 * 2. If INTERNAL_ADDRESS is set (multi-node mode) but no secret is configured,
 *    reject all requests (fail closed).
 * 3. If neither is set (single-node / dev mode), allow all requests.
 */
export const internalAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.internalSecret) {
    if (config.internalAddress) {
      // Multi-node mode without a secret — fail closed
      logger.warn(`[InternalAuth] Rejected request to ${req.path} — INTERNAL_SECRET not configured in multi-node mode`);
      res.status(403).json({ error: 'Forbidden: INTERNAL_SECRET must be configured in multi-node mode' });
      return;
    }
    // Single-node mode — allow
    next();
    return;
  }

  const provided = req.headers['x-internal-secret'] as string | undefined;

  if (!provided) {
    logger.warn(`[InternalAuth] Rejected request to ${req.path} — missing secret`);
    res.status(403).json({ error: 'Forbidden: invalid internal secret' });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(config.internalSecret, 'utf8');
  const actual = Buffer.from(provided, 'utf8');

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    logger.warn(`[InternalAuth] Rejected request to ${req.path} — invalid secret`);
    res.status(403).json({ error: 'Forbidden: invalid internal secret' });
    return;
  }

  next();
};
