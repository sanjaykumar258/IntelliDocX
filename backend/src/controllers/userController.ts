import { Request, Response } from 'express';
import * as userService from '../services/userService';
import prisma from '../utils/prisma';
import { RegisterUserSchema } from '../utils/validation';
import { AuthRequest } from '../middleware/auth';
import { io } from '../app';

/**
 * Create a new user within the admin's organization
 * @route POST /users
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const data = RegisterUserSchema.parse(req.body);
    
    // Ensure admin creates users only for their own organization
    if (req.user?.organizationId !== data.organizationId) {
       return res.status(403).json({ message: 'Cannot create user for another organization' });
    }

    const user = await userService.createUser(data);
    
    // Emit real-time creation event
    io.to(`org:${data.organizationId}`).emit('user:created', {
      userId: user.id,
      name: user.name,
      role: user.role
    });

    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(400).json({ message: error.errors || error.message });
  }
};

/**
 * Get all users for the current organization
 * @route GET /users
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) return res.status(400).json({ message: 'User has no organization' });
    
    const users = await userService.getUsers(orgId);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update user details
 * @route PUT /users/:id
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get own profile
 * @route GET /users/me
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, avatarUrl: true, theme: true, accentColor: true, role: true, organizationId: true } });
    if (!user) return res.status(401).json({ message: 'User not found — please log in again' });
    res.json({ user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Update own profile (self-service)
 * @route PATCH /users/me
 */
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Verify user still exists (handles stale tokens after DB re-seed)
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return res.status(401).json({ message: 'User not found — please log in again' });

    // Only allow safe fields for self-update (email and role changes go through admin)
    const { name, avatar, theme, accentColor } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    const updateData: any = { name: name.trim() };
    if (avatar !== undefined) updateData.avatarUrl = avatar;
    if (theme !== undefined) updateData.theme = theme;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    const user = await userService.updateUser(userId, updateData);
    res.json({ message: 'Profile updated', user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Upload avatar image (multipart/form-data)
 * @route POST /users/me/avatar
 */
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No image file provided' });

    // Convert the uploaded file buffer to a base64 data URL
    // This stores the avatar inline in the database (avatarUrl is @db.Text)
    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Save to database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: dataUrl },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    });

    res.json({ message: 'Avatar uploaded', avatarUrl: user.avatarUrl, user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Delete a user
 * @route DELETE /users/:id
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete all users in organization
 * @route DELETE /users/all
 */
export const deleteAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.organizationId;
    const currentUserId = req.user?.userId;
    if (!orgId || !currentUserId) return res.status(400).json({ message: 'Missing user context' });

    await userService.deleteAllUsers(orgId, currentUserId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
