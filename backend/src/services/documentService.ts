import prisma from '../utils/prisma';
import { DocumentStatus } from '@prisma/client';

import { eventBus, EVENTS } from '../events/eventBus';
import redisClient from '../utils/redis';

const invalidateCache = async (organizationId: string) => {
  if (redisClient.isOpen) {
    const pattern = `docs:list:${organizationId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }
};

export const createDocument = async (
  data: {
    title: string;
    description?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    ownerId: string;
    organizationId: string;
    extractedText?: string;
    category?: string;
    confidence?: number;
  },
  filePath?: string
) => {
  if (data.category) {
    data.category = data.category.toUpperCase().replace(/\s+/g, '_');
  }
  const doc = await prisma.document.create({
    data: {
      ...data,
      currentVersion: 1,
      status: DocumentStatus.ACTIVE,
    },
  });

  eventBus.emit(EVENTS.DOCUMENT_UPLOADED, {
    documentId: doc.id,
    userId: data.ownerId,
    organizationId: data.organizationId,
    title: doc.title,
    filePath
  });

  await invalidateCache(data.organizationId);

  return doc;
};

export const getDocumentById = async (id: string, organizationId: string) => {
  return await prisma.document.findFirst({
    where: {
      id,
      organizationId,
      status: { not: DocumentStatus.DELETED },
    },
    include: {
      metadata: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

export const listDocuments = async (organizationId: string, page: number = 1, limit: number = 20, filters?: { category?: string, department?: string }) => {
  const skip = (page - 1) * limit;
  const upperCat = filters?.category?.toUpperCase();
  const cacheKey = `docs:list:${organizationId}:${page}:${limit}:${upperCat || 'all'}:${filters?.department?.toLowerCase() || 'all'}`;

  // Prevent hanging if Redis is sluggish or disconnected
  if (redisClient.isOpen) {
    try {
      // 1-second timeout for cache retrieval
      const cached = await Promise.race([
        redisClient.get(cacheKey),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), 1000))
      ]);
      
      if (cached) {
        console.log('[Cache] Serving from cache:', cacheKey);
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[Cache] Redis skip:', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  // Import category groups for parent-category expansion
  const { CATEGORY_GROUPS } = await import('./documentClassifier.service');

  const whereClause: any = {
    organizationId,
    status: { not: DocumentStatus.DELETED },
  };

  // ═══ CATEGORY FILTERING ═══
  if (upperCat && upperCat !== 'ALL') {
    // Check if this is a parent category group name (e.g., 'FINANCIAL')
    if (CATEGORY_GROUPS[upperCat]) {
      // Expand to all sub-categories in this group (e.g., ['FINANCIAL_STATEMENT', ...])
      whereClause.category = { in: CATEGORY_GROUPS[upperCat] };
    } else {
      // Direct match for specific category
      whereClause.category = upperCat;
    }
  }

  if (filters?.department) {
    whereClause.metadata = {
      department: filters.department
    };
  }

  const [data, total] = await Promise.all([
    prisma.document.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, name: true },
        },
        metadata: true
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.document.count({
      where: whereClause
    })
  ]);

  const result = { data, total, page, limit, totalPages: Math.ceil(total / limit) };

  if (redisClient.isOpen) {
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
  }

  return result;
};

export const updateDocument = async (id: string, data: any) => {
  const doc = await prisma.document.update({
    where: { id },
    data,
  });

  await invalidateCache(doc.organizationId);
  return doc;
};

export const deleteDocument = async (id: string) => {
  const doc = await prisma.document.update({
    where: { id },
    data: { status: DocumentStatus.DELETED },
  });

  await invalidateCache(doc.organizationId);
  return doc;
};

export const createMetadata = async (documentId: string, data: any) => {
  if (data.category) {
    data.category = data.category.toUpperCase().replace(/\s+/g, '_');
  }
  return await prisma.documentMetadata.create({
    data: {
      documentId,
      ...data,
      tags: data.tags || [],
    },
  });
};
