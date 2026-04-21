import jwt from 'jsonwebtoken';
import Logger from './logger';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret_dev_only';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'refresh_secret_dev_only';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Warn if running with default (insecure) secrets in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_ACCESS_SECRET && !process.env.JWT_SECRET) {
    Logger.error('SECURITY WARNING: JWT_ACCESS_SECRET is not set! Using default insecure secret.');
  }
  if (!process.env.JWT_REFRESH_SECRET && !process.env.JWT_SECRET) {
    Logger.error('SECURITY WARNING: JWT_REFRESH_SECRET is not set! Using default insecure secret.');
  }
}

export const signAccessToken = (payload: object): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const signRefreshToken = (payload: object): string => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token: string): object | null => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as object;
  } catch (error: any) {
    Logger.debug(`[JWT] Access token verification failed: ${error.message}`);
    return null;
  }
};

export const verifyRefreshToken = (token: string): object | null => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as object;
  } catch (error: any) {
    Logger.debug(`[JWT] Refresh token verification failed: ${error.message}`);
    return null;
  }
};
