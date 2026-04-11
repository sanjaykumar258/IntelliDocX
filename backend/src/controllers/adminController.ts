import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as adminService from '../services/adminService';
import * as approvalService from '../services/approvalService';
import { z } from 'zod';
import Logger from '../utils/logger';

// Validation schemas
const InviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'IT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'GUEST']),
});

const AcceptInvitationSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8),
});

const ChangeRoleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'IT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'GUEST']),
});

const ResolveApprovalSchema = z.object({
  action: z.enum(['APPROVED_ACTION', 'REJECTED_ACTION']),
  comment: z.string().optional(),
});

/**
 * POST /api/admin/invite - Invite a new user
 */
export const inviteUser = async (req: AuthRequest, res: Response) => {
  try {
    const data = InviteUserSchema.parse(req.body);
    const user = req.user;

    const invitation = await adminService.inviteUser({
      email: data.email,
      name: data.name,
      role: data.role as any,
      invitedById: user.userId,
      organizationId: user.organizationId,
    });

    res.status(201).json(invitation);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.errors });
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * POST /api/admin/accept-invitation - Accept an invitation (public)
 */
export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const data = AcceptInvitationSchema.parse(req.body);
    const user = await adminService.acceptInvitation(data.token, data.password);
    res.status(201).json(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.errors });
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/admin/users - Get all users with stats
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await adminService.getUsersWithStats(req.user.organizationId);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/role - Change user role
 */
export const changeUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const data = ChangeRoleSchema.parse(req.body);
    const user = await adminService.changeUserRole(
      req.params.id,
      data.role as any,
      req.user.organizationId
    );
    res.json(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.errors });
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/toggle-status - Suspend/reactivate user
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await adminService.toggleUserStatus(req.params.id, req.user.organizationId);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/admin/invitations - Get all invitations
 */
export const getInvitations = async (req: AuthRequest, res: Response) => {
  try {
    const invitations = await adminService.getInvitations(req.user.organizationId);
    res.json(invitations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/stats - Get organization stats
 */
export const getOrgStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await adminService.getOrgStats(req.user.organizationId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/approvals - Get all approval requests
 */
export const getApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await approvalService.getAllApprovals(req.user.organizationId, page, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/approvals/pending - Get pending approvals
 */
export const getPendingApprovals = async (req: AuthRequest, res: Response) => {
  try {
    const approvals = await approvalService.getPendingApprovals(req.user.organizationId);
    res.json(approvals);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/admin/approvals/:id/resolve - Approve or reject
 */
export const resolveApproval = async (req: AuthRequest, res: Response) => {
  try {
    const data = ResolveApprovalSchema.parse(req.body);
    const result = await approvalService.resolveApproval(
      req.params.id,
      data.action,
      req.user.userId,
      req.user.organizationId,
      data.comment
    );
    res.json(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: error.errors });
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * POST /api/admin/approvals/request - Request an approval (used by other controllers)
 */
export const requestApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { actionType, entityType, entityId, reason, metadata } = req.body;
    const result = await approvalService.requestApproval({
      actionType,
      entityType,
      entityId,
      requestedById: req.user.userId,
      organizationId: req.user.organizationId,
      reason,
      metadata,
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
