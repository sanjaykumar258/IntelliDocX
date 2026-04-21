import { Request, Response } from 'express';
import { clearDocumentCache } from '../utils/redis';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { WorkflowStatus } from '@prisma/client';

/**
 * GET /api/documents/my/stats
 * Returns KPI counts for the logged-in employee's documents
 */
export const getMyDocumentStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const orgId = req.user.organizationId;

    const docs = await prisma.document.findMany({
      where: { ownerId: userId, organizationId: orgId },
      include: {
        workflowInstances: {
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      }
    });

    let total = docs.length;
    let pending = 0, under_review = 0, approved = 0, rejected = 0;

    for (const doc of docs as any[]) {
      const wf = doc.workflowInstances[0];
      if (!wf) { pending++; continue; }
      if (wf.status === WorkflowStatus.PENDING) {
        // If currentStepIndex is 1, it's just submitted
        if (wf.currentStepIndex <= 1) pending++;
        else under_review++;
      } else if (wf.status === WorkflowStatus.APPROVED) {
        approved++;
      } else if (wf.status === WorkflowStatus.REJECTED) {
        rejected++;
      } else {
        under_review++;
      }
    }

    res.json({ total, pending, under_review, approved, rejected });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/documents/my
 * Returns all documents for the logged-in employee with workflow status
 */
export const getMyDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const orgId = req.user.organizationId;

    const { status, page = '1', limit = '1000' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const docs = await prisma.document.findMany({
      where: { ownerId: userId, organizationId: orgId },
      include: {
        metadata: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        workflowInstances: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: {
            template: {
              include: { steps: { orderBy: { order: 'asc' } } }
            },
            approvalActions: {
              orderBy: { performedAt: 'asc' }
            },
            logs: {
              orderBy: { createdAt: 'asc' },
              include: { performedBy: { select: { id: true, name: true, email: true, role: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string)
    });

    // Map each document to include a normalized status + approval_log
    const mapped = (docs as any[]).map(doc => {
      const wf = doc.workflowInstances[0];
      let docStatus = 'PENDING_REVIEW';
      let currentStage = 1;

      if (wf) {
        currentStage = wf.currentStepIndex;
        if (wf.status === WorkflowStatus.APPROVED) docStatus = 'APPROVED';
        else if (wf.status === WorkflowStatus.REJECTED) docStatus = 'REJECTED';
        else if (wf.status === WorkflowStatus.PENDING) {
          docStatus = wf.currentStepIndex <= 1 ? 'PENDING_REVIEW' : 'UNDER_REVIEW';
        }
      }

      // Build approval timeline from workflow logs for accurate status and comments
      // Filter out STARTED logs from the timeline
      const approvalLog = (wf?.logs || [])
        .filter((log: any) => log.action !== 'STARTED')
        .map((log: any) => {
        let statusStr = 'pending';
        if (log.action === 'APPROVED_STEP' || log.action === 'APPROVED_FINAL') statusStr = 'approved';
        if (log.action === 'REJECTED') statusStr = 'rejected';

        return {
          stage: log.performedBy?.role || 'UNKNOWN',
          role: log.performedBy?.role || 'UNKNOWN',
          reviewer_name: log.performedBy?.name || 'Unknown',
          reviewer_email: log.performedBy?.email || '',
          status: statusStr,
          action_comment: log.comment || '',
          timestamp: log.createdAt
        };
      });

      // Get rejection info from last rejected log
      const rejectionLog = (wf?.logs || []).filter(l => l.toStatus === WorkflowStatus.REJECTED).pop();
      let rejection_comment = null;
      if (rejectionLog) {
        try {
          rejection_comment = JSON.parse(rejectionLog.comment || '{}');
        } catch {
          rejection_comment = { reason: rejectionLog.comment || '', fix_items: [] };
        }
      }

      return {
        id: doc.id,
        name: doc.title || doc.fileName,
        fileName: doc.fileName,
        category: doc.category || doc.metadata?.category || 'General',
        version: doc.currentVersion || 1,
        status: docStatus,
        uploaded_at: doc.createdAt,
        current_stage: currentStage,
        mimeType: doc.mimeType,
        approval_log: approvalLog,
        rejection_comment,
        workflow_id: wf?.id || null
      };
    });

    // Filter by status if requested
    const filtered = status && status !== 'all'
      ? mapped.filter(d => d.status === (status as string).toUpperCase())
      : mapped;

    res.json({ data: filtered, total: filtered.length });
  } catch (err: any) {
    console.error('[getMyDocuments]', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/documents/:id/approval-history
 * Returns the full approval timeline for a specific document
 */
export const getApprovalHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const doc = await prisma.document.findFirst({
      where: { id, ownerId: userId }
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const wf = await prisma.workflowInstance.findFirst({
      where: { documentId: id },
      orderBy: { startedAt: 'desc' },
      include: {
        template: { include: { steps: { orderBy: { order: 'asc' } } } },
        logs: {
          orderBy: { createdAt: 'asc' },
          include: { performedBy: { select: { id: true, name: true, email: true, role: true } } }
        },
        approvalActions: { orderBy: { performedAt: 'asc' } }
      }
    });

    if (!wf) return res.json({ steps: [], workflow: null });

    const steps = (wf.template?.steps || []).map((step, i) => {
      const log = wf.logs.find(l => l.fromStatus === null ? i === 0 : true);
      const action = wf.approvalActions.find(a => a.stepId === step.id);
      let status = 'waiting';
      if (wf.currentStepIndex > step.order) status = 'approved';
      else if (wf.currentStepIndex === step.order) {
        if (wf.status === WorkflowStatus.REJECTED) status = 'rejected';
        else if (wf.status === WorkflowStatus.APPROVED) status = 'approved';
        else status = 'pending';
      }

      return {
        stage: step.requiredRole,
        reviewer_name: step.name || step.requiredRole,
        reviewer_email: '',
        status,
        action_comment: action?.comment || '',
        timestamp: action?.performedAt || null
      };
    });

    // Prepend "You (Employee)" step
    const employeeStep = {
      stage: 'EMPLOYEE',
      reviewer_name: 'You (Employee)',
      reviewer_email: req.user.email,
      status: 'approved' as const,
      action_comment: 'Uploaded document',
      timestamp: doc.createdAt
    };

    res.json({ steps: [employeeStep, ...steps], workflowId: wf.id, workflowStatus: wf.status });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/documents/:id/withdraw
 * Employee withdraws a pending document (deletes it)
 */
export const withdrawDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const doc = await prisma.document.findFirst({ where: { id, ownerId: userId } });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Check it's still pending
    const wf = await prisma.workflowInstance.findFirst({
      where: { documentId: id },
      orderBy: { startedAt: 'desc' }
    });
    if (wf && wf.status !== WorkflowStatus.PENDING) {
      return res.status(400).json({ message: 'Can only withdraw documents still in pending review' });
    }

    // Delete workflow instances and document
    await prisma.$transaction(async tx => {
      await tx.workflowInstance.deleteMany({ where: { documentId: id } });
      await tx.auditLog.updateMany({ where: { documentId: id }, data: { documentId: null } });
      await tx.documentMetadata.deleteMany({ where: { documentId: id } });
      await tx.documentVersion.deleteMany({ where: { documentId: id } });
      await tx.documentShare.deleteMany({ where: { documentId: id } });
      await tx.documentComment.deleteMany({ where: { documentId: id } });
      await tx.document.delete({ where: { id } });
    });

    await clearDocumentCache(req.user.organizationId);
      res.json({ message: 'Document withdrawn successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
