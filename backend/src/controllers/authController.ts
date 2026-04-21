import { Request, Response } from 'express';
import * as authService from '../services/authService';
import * as auditService from '../services/auditService';
import { LoginSchema } from '../utils/validation';
import { AuditAction } from '@prisma/client';
import prisma from '../utils/prisma';

/**
 * Login user and issue tokens
 * @route POST /auth/login
 */
export const login = async (req: Request, res: Response) => {
  const data = LoginSchema.parse(req.body);
  const ip = req.ip || 'unknown';
  try {
    console.log(`[LOGIN ATTEMPT] Email: ${data.email}`);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const result = await authService.login(data.email, data.password, ip, userAgent) as any;
    // @ts-ignore
    if ((result as any).requires2fa) {
      console.log(`[LOGIN 2FA REQUIRED] User: ${data.email}`);
      return res.json(result);
    }
    console.log(`[LOGIN SUCCESS] User: ${data.email}`);
    
    // Audit log
    await auditService.logAction(
      AuditAction.LOGIN,
      (result as any).user.id,
      (result as any).user.organizationId,
      undefined,
      req.ip
    );

    res.json(result);
  } catch (error: any) {
    console.error(`[LOGIN FAILED] Error: ${error.message}`);
    
    // Attempt to log failed login if the user actually exists
    try {
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (user) {
            await auditService.logAction(
                AuditAction.FAILED_LOGIN,
                user.id,
                user.organizationId,
                undefined,
                req.ip
            );
        }
    } catch (e) {
        // Ignore errors during failed login audit attempt
    }

    res.status(401).json({ message: error.message });
  }
};

/**
 * Refresh access token using refresh token
 * @route POST /auth/refresh
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
    
    const ip = req.ip || 'unknown';
    const result = await authService.refresh(refreshToken, ip);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

/**
 * Logout user and revoke token
 * @route POST /auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        await authService.logout(token);
    }
    if (req.body.refreshToken) {
        await authService.revokeSession(req.body.refreshToken);
    }
    res.status(200).json({ message: 'Logged out' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- Sessions --- //

export const getSessions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const refreshToken = (req.query.refreshToken as string) || '';
    const sessions = await authService.getSessions(userId);
    let currentId = '';
    if (refreshToken) {
      const tokenRec = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (tokenRec) currentId = tokenRec.id;
    }
    const mapped = sessions.map((s: any) => ({
      ...s,
      isCurrent: s.id === currentId
    }));
    mapped.sort((a: any, b: any) => (a.isCurrent ? -1 : (b.isCurrent ? 1 : 0)));
    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const revokeSessionById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    await authService.revokeSessionById(id, userId);
    res.json({ message: 'Session revoked' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const revokeAllSessions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { refreshToken } = req.body;
    let excludeTokenId;
    if (refreshToken) {
      const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      if (storedToken) excludeTokenId = storedToken.id;
    }
    await authService.revokeAllSessions(userId, excludeTokenId);
    res.json({ message: 'All other sessions revoked' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- 2FA --- //

export const enable2fa = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const email = (req as any).user.email;
    const data = await authService.generate2faSecret(userId, email);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verify2fa = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });
    
    await authService.verifyAndEnable2fa(userId, token);
    res.json({ message: '2FA Enabled successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const disable2fa = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });
    
    await authService.disable2fa(userId, token);
    res.json({ message: '2FA Disabled successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};


export const verifyLogin2fa = async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ message: 'User ID and token required' });
    
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const result = await authService.loginWith2fa(userId, token, ip, userAgent) as any;
    
    await auditService.logAction(
      AuditAction.LOGIN,
      (result as any).user.id,
      (result as any).user.organizationId,
      undefined,
      req.ip
    );
    
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};
