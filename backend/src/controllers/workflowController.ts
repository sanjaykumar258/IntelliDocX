import { Request, Response } from 'express';
import * as workflowService from '../services/workflowService';
import * as auditService from '../services/auditService';
import { AuthRequest } from '../middleware/auth';
import { Role, AuditAction, WorkflowStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { io } from '../app';

export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { name, steps, slaConfig } = req.body;
    const user = req.user;

    if (user.role !== Role.ADMIN) {
      return res.status(403).json({ message: 'Unauthorized: Only administrators can create templates' });
    }

    const template = await workflowService.createTemplate(
      name,
      user.organizationId,
      user.userId,
      steps,
      slaConfig
    );
    res.status(201).json(template);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const templates = await workflowService.getTemplates(user.organizationId);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startWorkflow = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { templateId } = req.body;
    const user = req.user;

    const instance = await workflowService.startWorkflow(
      documentId,
      templateId,
      user.userId,
      user.organizationId
    );
    res.status(201).json(instance);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const performAction = async (req: AuthRequest, res: Response) => {
  try {
    const { instanceId } = req.params;
    const { action, comment } = req.body;
    const user = req.user;

    const result = await workflowService.processAction(
      instanceId,
      action,
      comment,
      user.userId,
      user.role,
      user.organizationId
    );

    // Filter events to only emit on definitive progression actions
    if (['APPROVE', 'REJECT', 'ESCALATE'].includes(action)) {
      io.to(`org:${user.organizationId}`).emit('workflow:updated', {
        instanceId,
        status: result.status,
        action
      });
      
      if (action === 'ESCALATE') {
        io.to(`org:${user.organizationId}`).emit('workflow:escalated', {
          instanceId,
          documentName: (result as any).document?.title || 'Document'
        });
      }
    }

    // Add Audit Log
    try {
      const instance = await prisma.workflowInstance.findUnique({ where: { id: instanceId } });
      if (instance) {
        const auditType = action === 'APPROVE' ? AuditAction.WORKFLOW_APPROVE : (action === 'REJECT' ? AuditAction.WORKFLOW_REJECT : null);
        if (auditType) {
          await auditService.logAction(
            auditType,
            user.userId,
            user.organizationId,
            instance.documentId,
            req.ip
          );
        }
      }
    } catch (e) {
      // Ignore non-critical audit failures
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getActiveInstances = async (req: AuthRequest, res: Response) => {
  try {
    // Include both PENDING and ESCALATED workflows so the dashboard shows all active cases
    const instances = await prisma.workflowInstance.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: { in: [WorkflowStatus.PENDING, 'ESCALATED' as any] },
      },
      include: {
        document: {
          include: {
            metadata: true
          }
        },
        template: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          }
        },
        approvalActions: true
      },
      orderBy: { startedAt: 'desc' }
    });

    return res.json({
      success: true,
      data: instances.filter(i => i.document !== null),
    });
  } catch (error) {
    console.error('Failed to fetch active workflows:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active workflows' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const history = await workflowService.getWorkflowHistory(documentId);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
