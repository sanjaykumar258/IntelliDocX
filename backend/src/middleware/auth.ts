import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import redisClient from '../utils/redis';
import Logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: any;
  file?: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    // Check Redis blacklist for revoked tokens (logout / session termination)
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token revoked' }); // Fixed: was 'Token revoken'
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded;
    Logger.debug(`[Auth] Authenticated: ${(decoded as any).email}`);
    next();
  } catch (error) {
    Logger.error(`[Auth] Middleware error: ${error}`);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
