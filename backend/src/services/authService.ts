import prisma from '../utils/prisma';
import { comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import redisClient from '../utils/redis';
import Logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export const login = async (email: string, password: string, ipAddress: string, userAgent: string) => {
  Logger.info(`[AuthService] Login attempt for: ${email}`);

  // Explicitly select all needed fields including 2FA
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, name: true, email: true, passwordHash: true,
      role: true, status: true, organizationId: true,
      isTwoFactorEnabled: true, twoFactorSecret: true,
      avatarUrl: true, theme: true, accentColor: true,
    },
  });

  if (!user) {
    Logger.warn(`[AuthService] User not found: ${email}`);
    throw new Error('Invalid credentials');
  }

  if (user.status !== 'ACTIVE') {
    Logger.warn(`[AuthService] User inactive: ${email}`);
    await prisma.loginHistory.create({
      data: { userId: user.id, ipAddress, userAgent, success: false }
    });
    throw new Error('Account suspended');
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    Logger.warn(`[AuthService] Invalid password for: ${email}`);
    await prisma.loginHistory.create({
      data: { userId: user.id, ipAddress, userAgent, success: false }
    });
    throw new Error('Invalid credentials');
  }

  if (user.isTwoFactorEnabled) {
    Logger.info(`[AuthService] 2FA required for: ${email}`);
    return { requires2fa: true, userId: user.id };
  }

  return generateTokensForUser(user, ipAddress, userAgent);
};

const generateTokensForUser = async (user: any, ipAddress: string, userAgent: string) => {
  await prisma.loginHistory.create({
    data: { userId: user.id, ipAddress, userAgent, success: true }
  });

  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId
  };

  const accessToken = signAccessToken(payload);
  const refreshTokenString = signRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Parse device name from user agent (truncated for storage)
  const deviceName = (userAgent || 'Unknown Device').substring(0, 100);
  const location = 'Remote access';

  // Use Prisma unchecked create to include optional fields
  await prisma.refreshToken.create({
    data: {
      token: refreshTokenString,
      userId: user.id,
      expiresAt,
      deviceName,  // field exists in schema
      location,    // field exists in schema
    }
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      isTwoFactorEnabled: user.isTwoFactorEnabled ?? false,
      avatarUrl: user.avatarUrl || null,
      theme: user.theme || 'system',
      accentColor: user.accentColor || '#6366f1',
    },
    accessToken,
    refreshToken: refreshTokenString,
  };
};

export const loginWith2fa = async (userId: string, token: string, ipAddress: string, userAgent: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, passwordHash: true,
      role: true, status: true, organizationId: true,
      isTwoFactorEnabled: true, twoFactorSecret: true,
      avatarUrl: true, theme: true, accentColor: true,
    },
  });

  if (!user || user.status !== 'ACTIVE' || !user.twoFactorSecret) {
    throw new Error('Invalid user or 2FA not configured');
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1, // Allow 30s clock skew
  });

  if (!isValid) {
    await prisma.loginHistory.create({
      data: { userId: user.id, ipAddress, userAgent, success: false }
    });
    throw new Error('Invalid 2FA code');
  }

  return generateTokensForUser(user, ipAddress, userAgent);
};

export const refresh = async (token: string, ipAddress: string) => {
  // 1. Verify JWT signature
  const decoded = verifyRefreshToken(token) as any;
  if (!decoded) {
    throw new Error('Invalid refresh token');
  }

  // 2. Check DB for token status
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!storedToken) {
    // Token reuse detection could happen here (if we tracked families)
    throw new Error('Invalid refresh token');
  }

  if (storedToken.revoked) {
    // Security alert: Revoked token usage attempt
    Logger.warn(`[AuthService] Attempt to use revoked token by user ${storedToken.userId}`);
    throw new Error('Token revoked');
  }

  if (new Date() > storedToken.expiresAt) {
    throw new Error('Token expired');
  }

  const user = storedToken.user;
  if (user.status !== 'ACTIVE') {
    throw new Error('User inactive');
  }

  // 3. Rotate Token
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId
  };

  const newAccessToken = signAccessToken(payload);
  const newRefreshTokenString = signRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Transaction: Revoke old, create new
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true, replacedByToken: newRefreshTokenString }
    }),
    prisma.refreshToken.create({
      data: {
        token: newRefreshTokenString,
        userId: user.id,
        expiresAt
      }
    })
  ]);

  return { accessToken: newAccessToken, refreshToken: newRefreshTokenString };
};

export const logout = async (token: string) => {
  // Revoke in DB
  try {
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true }
    });
  } catch (e) {
    // Token might not exist in DB if it was just a random string
  }

  // Also add to Redis blacklist for immediate JWT invalidation if we were checking that for Access Tokens (we are)
  // But wait, logout usually sends Access Token. Refresh Token is separate.
  // If `token` here is Access Token, we blacklist it.
  // If `token` is Refresh Token, we revoke it.
  // Usually logout endpoint receives Access Token in header and maybe Refresh Token in body.

  // Assuming this `logout` function handles Access Token blacklisting
  await redisClient.set(`blacklist:${token}`, 'true', { EX: 3600 });
};

export const revokeSession = async (refreshToken: string) => {
  await prisma.refreshToken.update({
    where: { token: refreshToken },
    data: { revoked: true }
  });
};

export const revokeSessionById = async (id: string, userId: string) => {
  await prisma.refreshToken.updateMany({
    where: { id, userId },
    data: { revoked: true }
  });
  return { success: true };
};

export const revokeAllSessions = async (userId: string, excludeTokenId?: string) => {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      ...(excludeTokenId ? { id: { not: excludeTokenId } } : {})
    },
    data: { revoked: true }
  });
  return { success: true };
};

export const getSessions = async (userId: string) => {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });

  return tokens.map(t => ({
    id: t.id,
    device: t.deviceName || 'Unknown Device',
    location: t.location || 'Unknown Location',
    time: t.createdAt.toISOString(),
    isCurrent: false // Will be mapped by controller based on active token
  }));
};

export const generate2faSecret = async (userId: string, email: string) => {
  const secret = speakeasy.generateSecret({ name: `IntelliDocX (${email})` });
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url as string);

  // Save secret temporarily or directly to user (if they must verify to enable, we save it first)
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret.base32 }
  });

  return { secret: secret.base32, qrCode: qrCodeDataUrl };
};

export const verifyAndEnable2fa = async (userId: string, token: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) {
    throw new Error('2FA not initialized for this user');
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token
  });

  if (!isValid) {
    throw new Error('Invalid 2FA code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isTwoFactorEnabled: true }
  });

  return { success: true };
};

export const disable2fa = async (userId: string, token: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) {
    throw new Error('2FA not active');
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token
  });

  if (!isValid) {
    throw new Error('Invalid 2FA code');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isTwoFactorEnabled: false, twoFactorSecret: null }
  });

  return { success: true };
};
