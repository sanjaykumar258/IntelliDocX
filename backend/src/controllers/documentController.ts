import { Request, Response } from 'express';
import archiver from 'archiver';
import * as documentService from '../services/documentService';
import * as versionService from '../services/versionService';
import * as auditService from '../services/auditService';
import { aiClientService } from '../services/aiClientService';
import { blockchainService } from '../blockchain/blockchainService';
import { uploadFileStream, getFileStream, BUCKET_NAME } from '../storage/minioClient';
import { calculateFileHash } from '../utils/hash';
import { validateFile } from '../utils/fileValidation';
import { AuthRequest } from '../middleware/auth';
import { AuditAction, WorkflowStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { addDocumentJob } from '../services/queueService';
import { io } from '../app';

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const user = req.user;
    
    if (!files || files.length === 0) {
      console.warn('[Upload] No files in request. req.files:', req.files);
      return res.status(400).json({ message: 'No files uploaded' });
    }

    console.log(`[Upload] User ${user.userId} (${user.organizationId}) is uploading ${files.length} files.`);
    const results = [];

    for (const file of files) {
      console.log(`[Upload] Processing file: ${file.originalname} (${file.size} bytes)`);
      const { title, description, department, category, tags } = req.body;

      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        console.error(`[Upload] Validation failed for ${file.originalname}: ${validation.error}`);
        results.push({ fileName: file.originalname, status: 'error', error: validation.error });
        continue;
      }

      try {
        console.log(`[Upload] Calculating hash for ${file.originalname}...`);
        const fileHash = calculateFileHash(file.buffer);
        const objectName = `${user.organizationId}/${uuidv4()}-${file.originalname}`;

        console.log(`[Upload] Uploading to Storage: ${objectName}`);
        await uploadFileStream(objectName, file.buffer, file.size, {
          'Content-Type': file.mimetype,
          'x-amz-meta-original-name': file.originalname,
        });

        console.log(`[Upload] Creating DB record for ${file.originalname}...`);
        const doc = await documentService.createDocument({
          title: title || file.originalname,
          description,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size || file.buffer.length,
          ownerId: user.userId,
          organizationId: user.organizationId,
          category: 'OTHER',
          confidence: 0
        }, objectName);

        if (department || category || tags) {
          await documentService.createMetadata(doc.id, {
            department,
            category: category || 'OTHER',
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
          });
        }

        // Auto-trigger Workflow
        try {
          const template = await prisma.workflowTemplate.findFirst({
            where: { organizationId: user.organizationId, isActive: true },
            include: { slaConfig: true }
          });
          
          if (template) {
            const slaHours = template.slaConfig?.maxApprovalHours || 48;
            await prisma.workflowInstance.create({
              data: {
                documentId: doc.id,
                templateId: template.id,
                organizationId: user.organizationId,
                status: WorkflowStatus.PENDING,
                currentStepIndex: 1,
                startedById: user.userId,
                dueDate: new Date(Date.now() + slaHours * 60 * 60 * 1000)
              }
            });
          }
        } catch (wfErr) {
          console.error(`[Upload] Workflow trigger failed (non-blocking) for ${doc.id}:`, wfErr);
        }

        console.log(`[Upload] Creating version record for ${file.originalname}...`);
        await versionService.createVersion(doc.id, 1, objectName, fileHash, user.userId);

        console.log(`[Upload] Accessing Audit Service...`);
        await auditService.logAction(AuditAction.UPLOAD, user.userId, user.organizationId, doc.id, req.ip);

        try {
          await addDocumentJob(doc.id, objectName, user.organizationId, title || file.originalname, file.originalname);
        } catch (queueErr) {
          console.error(`[Upload] Queueing failed (non-blocking) for ${doc.id}:`, queueErr);
        }

        io.to(`org:${user.organizationId}`).emit('document:uploaded', {
          documentId: doc.id,
          name: doc.title,
          uploadedBy: user.name || user.email || 'Unknown User'
        });

        results.push({ id: doc.id, fileName: file.originalname, status: 'success' });
        console.log(`[Upload] ✅ Successfully processed ${file.originalname}`);

      } catch (err) {
        console.error(`[Upload] ❌ Failed to process ${file.originalname}:`, err);
        results.push({ fileName: file.originalname, status: 'error', error: (err as any).message });
      }
    }

    res.status(201).json({ 
      message: `Processed ${files.length} files`, 
      results,
      successCount: results.filter(r => r.status === 'success').length,
      errorCount: results.filter(r => r.status === 'error').length
    });
  } catch (error: any) {
    console.error('[Upload] Fatal error in uploadDocument:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { category, department } = req.query;
    const filters = {
      category: typeof category === 'string' ? category : undefined,
      department: typeof department === 'string' ? department : undefined
    };

    const result = await documentService.listDocuments(user.organizationId, page, limit, filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const searchDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { q, department, category } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }

    const filters: any = {};
    if (department) filters.department = department;
    if (category) filters.category = category;

    const searchResults = await aiClientService.search(q, user.organizationId, filters);

    if (!searchResults || searchResults.length === 0) {
      // Fallback: Keyword Search via Prisma
      const keywordDocs = await prisma.document.findMany({
        where: {
          organizationId: user.organizationId,
          status: { not: 'DELETED' },
          OR: [
            { title: { contains: q as string, mode: 'insensitive' } },
            { fileName: { contains: q as string, mode: 'insensitive' } },
            { category: { contains: q as string, mode: 'insensitive' } }
          ]
        },
        include: {
          owner: { select: { id: true, name: true } },
          metadata: true
        },
        take: 20
      });

      return res.json(keywordDocs.map(d => ({
        ...d,
        score: 1.0, // Default score for keyword matches
        isKeywordMatch: true
      })));
    }

    const docIds = searchResults.map((r: any) => r.documentId);
    const docs = await prisma.document.findMany({
      where: {
        id: { in: docIds },
        organizationId: user.organizationId,
        status: { not: 'DELETED' }
      },
      include: {
        owner: { select: { id: true, name: true } },
        metadata: true
      }
    });
    const docsMap = new Map(docs.map(d => [d.id, d]));

    const finalResults = searchResults
      .map((r: any) => {
        const doc = docsMap.get(r.documentId);
        if (!doc) return null;
        return {
          ...(doc as any),
          score: r.score,
          aiMetadata: {
            department: r.department,
            category: r.category
          }
        };
      })
      .filter((r: any) => r !== null);

    res.json(finalResults);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getDocumentById = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const doc = await documentService.getDocumentById(req.params.id, user.organizationId);

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(doc);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDocumentFile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const user = req.user;

    const validation = validateFile(file as Express.Multer.File);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const fileHash = calculateFileHash(file.buffer);
    const objectName = `${user.organizationId}/${uuidv4()}-${file.originalname}`;

    // Upload to MinIO
    await uploadFileStream(objectName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'x-amz-meta-original-name': file.originalname,
    });

    // Create New Version (This handles Blockchain Update)
    const newVersionNumber = doc.currentVersion + 1;
    const version = await versionService.createVersion(
      doc.id,
      newVersionNumber,
      objectName,
      fileHash,
      user.userId
    );

    // Update Document Metadata if provided (e.g. filename changes)
    await documentService.updateDocument(doc.id, {
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    });

    // Audit Log
    await auditService.logAction(
      AuditAction.UPDATE,
      user.userId,
      user.organizationId,
      doc.id,
      req.ip
    );

    res.json({ message: 'Document updated', version: newVersionNumber, blockchainTx: version.blockchainTxHash });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rollbackDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { version } = req.body;
    const user = req.user;

    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    await versionService.rollbackVersion(id, Number(version), user.userId);

    // Audit Log
    await auditService.logAction(
      AuditAction.ROLLBACK,
      user.userId,
      user.organizationId,
      doc.id,
      req.ip
    );

    res.json({ message: `Rolled back to version ${version}` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // RBAC + Ownership Check:
    // Employees can only request deletion of their own documents
    if (user.role === 'EMPLOYEE' && doc.ownerId !== user.userId) {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own documents' });
    }

    // Admins, Managers, and the Document Owner can delete directly, others go through approval
    if (user.role === 'ADMIN' || user.role === 'MANAGER' || doc.ownerId === user.userId) {
      // 1. Delete from MinIO first if storage path is available
      try {
        const latestVersion = await prisma.documentVersion.findFirst({
          where: { documentId: id },
          orderBy: { versionNumber: 'desc' }
        });
        
        if (latestVersion?.storagePath) {
          const { deleteFile } = await import('../storage/minioClient');
          // Perform delete with try-catch to ensure DB purge continues even if MinIO fails
          try {
            await deleteFile(latestVersion.storagePath);
            console.log(`[Delete] File ${latestVersion.storagePath} removed from MinIO`);
          } catch (storageErr: any) {
            console.warn(`[Delete] MinIO file deletion failed: ${storageErr.message}. Proceeding with database purge.`);
          }
        }
      } catch (minioErr: any) {
        console.error('[Delete] Storage version lookup failed:', minioErr);
        // Continue with DB delete even if lookup fails
      }

      // 2. Delete from DB (Hard delete as requested by user: "deleted from MinIO AND PostgreSQL")
      // Note: Relation constraints might require multi-step delete or CASCADE.
      // We'll perform a soft delete first then hard delete if needed, 
      // but the user's prompt "both must be deleted" implies hard delete.
      await prisma.$transaction(async (tx) => {
        // Clear references that don't have Cascade delete
        await tx.auditLog.updateMany({
          where: { documentId: id },
          data: { documentId: null }
        });
        await tx.workflowInstance.deleteMany({ where: { documentId: id } });
        
        // Delete related child models
        await tx.documentMetadata.deleteMany({ where: { documentId: id } });
        await tx.documentVersion.deleteMany({ where: { documentId: id } });
        await tx.documentShare.deleteMany({ where: { documentId: id } });
        await tx.documentComment.deleteMany({ where: { documentId: id } });
        
        // Finally hard delete the document
        await tx.document.delete({ where: { id } });
      });

      // Audit Log
      await auditService.logAction(
        AuditAction.DELETE,
        user.userId,
        user.organizationId,
        id,
        req.ip
      );

      // Invalidate Redis cache so stale document list is not served
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const rc: any = require('../utils/redis').default;
        if (rc && rc.isOpen) {
          const pattern = `docs:list:${user.organizationId}:*`;
          const keys = await rc.keys(pattern);
          if (keys.length > 0) await rc.del(keys);
        }
      } catch (_) { /* non-critical */ }

      // Emit Real-Time Event
      io.to(`org:${user.organizationId}`).emit('document:deleted', {
        documentId: id
      });

      return res.status(204).send();
    }

    // Non-admin users: create approval request
    try {
      const { requestApproval } = await import('../services/approvalService');
      const approval = await requestApproval({
        actionType: 'DELETE_DOCUMENT',
        entityType: 'DOCUMENT',
        entityId: id,
        requestedById: user.userId,
        organizationId: user.organizationId,
        reason: req.body.reason || 'Document deletion requested',
        metadata: { documentTitle: doc.title, fileName: doc.fileName },
      });

      return res.status(202).json({ 
        message: 'Deletion request submitted for approval',
        approvalId: approval.id,
        status: 'PENDING_APPROVAL'
      });
    } catch (approvalErr: any) {
      if (approvalErr.message && approvalErr.message.includes('already exists')) {
        return res.status(409).json({ message: 'Deletion already pending' });
      }
      throw approvalErr;
    }
  } catch (error: any) {
    console.error('[DELETE_500]', error);
    res.status(500).json({ message: error.message });
  }
};


export const downloadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { version, inline } = req.query;
    const user = req.user;

    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    let targetVersion;
    if (version) {
      targetVersion = await versionService.getVersion(id, Number(version));
    } else {
      targetVersion = await versionService.getVersion(id, doc.currentVersion);
    }

    if (!targetVersion) return res.status(404).json({ message: 'Version not found' });

    // Stream file from MinIO
    const dataStream = await getFileStream(targetVersion.storagePath);

    const disposition = inline === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${doc.fileName}"`);

    dataStream.pipe(res);

    // Audit Log (Only log download if it's an actual download, not just a preview viewing)
    if (disposition === 'attachment') {
      await auditService.logAction(
        AuditAction.DOWNLOAD,
        user.userId,
        user.organizationId,
        doc.id,
        req.ip
      );
      
      // Phase 4: Blockchain Access Logging
      await blockchainService.logDocumentAccess(doc.id, user.userId, 'DOWNLOAD');
    } else {
      // Log view access on blockchain too
      await blockchainService.logDocumentAccess(doc.id, user.userId, 'VIEW');
    }
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
};

export const getDocumentVersions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const versions = await versionService.getVersions(id);
    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // 1. Get Document and Current Version
    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const currentVersion = await versionService.getVersion(id, doc.currentVersion);
    if (!currentVersion) return res.status(404).json({ message: 'Version not found' });

    // 2. Fetch File to re-calculate hash (Security measure)
    // Note: Ideally we store hash in DB and trust it, but re-calculating ensures file integrity on disk (MinIO) too.
    // However, downloading large files might be slow. For MVP, we use the hash stored in DB which was calculated at upload.
    const storedHash = currentVersion.fileHash;

    // 3. Verify with Blockchain
    const verification = await blockchainService.verifyDocumentIntegrity(id, storedHash);

    // 4. Update last verified time
    if (verification.verified) {
      await prisma.document.update({
        where: { id },
        data: { lastVerifiedAt: new Date() }
      });
    }

    res.json({
      documentId: id,
      version: currentVersion.versionNumber,
      isVerified: verification.verified,
      blockchainVersion: verification.version,
      storedHash: storedHash,
      lastVerifiedAt: new Date(),
      txHash: currentVersion.blockchainTxHash,
      blockchainAvailable: blockchainService.isAvailable()
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAuditCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Fetch DB Audit Logs
    const dbLogs = await prisma.auditLog.findMany({
      where: { documentId: id },
      orderBy: { timestamp: 'asc' },
      include: { user: true }
    });

    // Fetch Blockchain History
    const chainHistory = await blockchainService.getDocumentHistory(id);

    // Combine and format
    const certificateData = {
      documentId: id,
      generatedAt: new Date(),
      generatedBy: user.email,
      history: dbLogs.map(log => ({
        action: log.actionType,
        user: log.user.email,
        timestamp: log.timestamp,
        ip: log.ipAddress
      })),
      blockchainVerification: chainHistory
    };

    res.json(certificateData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadAllDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { category, department } = req.query;

    const filters = {
      category: typeof category === 'string' ? category : undefined,
      department: typeof department === 'string' ? department : undefined
    };

    console.log('[BulkDownload] Filters:', filters);

    // Fetch documents (limit 100 for safety in MVP)
    const result = await documentService.listDocuments(user.organizationId, 1, 100, filters);

    console.log('[BulkDownload] Found:', result.total);

    if (result.total === 0) {
      return res.status(404).json({ message: 'No documents found to download' });
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment('documents.zip');
    archive.pipe(res);

    for (const doc of result.data) {
      try {
        const currentVersion = await versionService.getVersion(doc.id, doc.currentVersion);
        if (currentVersion) {
          const fileStream = await getFileStream(currentVersion.storagePath);
          archive.append(fileStream, { name: doc.fileName });
        }
      } catch (err) {
        console.error(`Failed to add document ${doc.id} to archive:`, err);
      }
    }

    await archive.finalize();

  } catch (error: any) {
    console.error('Bulk download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to create zip archive' });
    }
  }
};

export const chatWithDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { message, history } = req.body;
    const user = req.user;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Verify document exists and belongs to organization
    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const result = await aiClientService.chat(id, user.organizationId, message, history || []);

    // Audit Log
    await auditService.logAction(
      AuditAction.AI_CHAT,
      user.userId,
      user.organizationId,
      doc.id,
      req.ip
    );

    res.json(result);
  } catch (error: any) {
    console.error('AI Chat Controller Error:', error);
    res.status(500).json({ message: 'Failed to process AI chat request' });
  }
};

// ===== Feature 9: Document Expiry =====
export const setExpiry = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { expiryDate, retentionDays, autoArchive } = req.body;
    const user = req.user;

    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const updated = await prisma.document.update({
      where: { id },
      data: {
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        retentionDays: retentionDays || null,
        autoArchive: autoArchive ?? false,
      },
    });

    res.json({ message: 'Expiry settings updated', document: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Feature 10: Comments =====
export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const comments = await prisma.documentComment.findMany({
      where: { documentId: id, parentCommentId: null },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text, parentCommentId } = req.body;
    const user = req.user;

    if (!text?.trim()) return res.status(400).json({ message: 'Comment text is required' });

    const comment = await prisma.documentComment.create({
      data: {
        documentId: id,
        userId: user.userId,
        text: text.trim(),
        parentCommentId: parentCommentId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Notify document owner
    try {
      const doc = await prisma.document.findUnique({ where: { id }, select: { ownerId: true, title: true } });
      if (doc && doc.ownerId !== user.userId) {
        await prisma.notification.create({
          data: {
            userId: doc.ownerId,
            organizationId: user.organizationId,
            type: 'DOCUMENT',
            title: 'New Comment',
            message: `${user.name || user.email} commented on "${doc.title}"`,
          },
        });
        io.to(`org:${user.organizationId}`).emit('notification:new', { userId: doc.ownerId });
      }
    } catch (e) { /* non-critical */ }

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Feature 10: Sharing =====
export const createShareLink = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions, expiresInHours, sharedWithEmail } = req.body;
    const user = req.user;

    const doc = await documentService.getDocumentById(id, user.organizationId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    const share = await prisma.documentShare.create({
      data: {
        documentId: id,
        token,
        permissions: permissions || 'VIEW',
        expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : null,
        createdById: user.userId,
        sharedWithEmail: sharedWithEmail || null,
      },
    });

    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/${token}`;

    // Notify shared user if email provided
    if (sharedWithEmail) {
      try {
        const sharedUser = await prisma.user.findUnique({ where: { email: sharedWithEmail } });
        if (sharedUser) {
          await prisma.notification.create({
            data: {
              userId: sharedUser.id,
              organizationId: user.organizationId,
              type: 'DOCUMENT',
              title: 'Document Shared With You',
              message: `${user.name || user.email} shared "${doc.title}" with you`,
            },
          });
        }
      } catch (e) { /* non-critical */ }
    }

    res.status(201).json({ ...share, shareUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getShares = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const shares = await prisma.documentShare.findMany({
      where: { documentId: id, isActive: true },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shares);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
