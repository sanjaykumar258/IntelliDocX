import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Role hierarchy levels — higher number = more authority
export const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 90,
  MANAGER: 80,
  HR_MANAGER: 75,
  IT_MANAGER: 75,
  TEAM_LEAD: 60,
  EMPLOYEE: 40,
  GUEST: 10,
};

// Check if user has one of the explicitly listed roles
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // SUPER_ADMIN always passes
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

// Check if user's role level is at or above the minimum threshold
export const requireMinRole = (minRole: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 999;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        message: `Forbidden: Requires at least ${minRole} level access` 
      });
    }

    next();
  };
};

// Helper: get role level for a given role
export const getRoleLevel = (role: string): number => {
  return ROLE_HIERARCHY[role] || 0;
};

// Helper: check if roleA can act upon roleB (roleA must be higher)
export const canActUpon = (actorRole: string, targetRole: string): boolean => {
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
};
