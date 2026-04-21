import prisma from '../utils/prisma';
import { hashPassword } from '../utils/password';
import { Role, UserStatus } from '@prisma/client';

export const createUser = async (data: any) => {
  const hashedPassword = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: hashedPassword,
      role: data.role as Role,
      organizationId: data.organizationId,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, name: true, email: true, role: true, organizationId: true, status: true, createdAt: true },
  });
};

export const getUsers = async (organizationId: string) => {
  return prisma.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
};

export const updateUser = async (id: string, data: any) => {
  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, status: true, avatarUrl: true },
  });
};

export const deleteUser = async (id: string) => {
  return prisma.user.delete({
    where: { id },
  });
};

export const deleteAllUsers = async (organizationId: string, currentUserId: string) => {
  return prisma.user.deleteMany({
    where: { 
      organizationId,
      id: { not: currentUserId }
    },
  });
};
