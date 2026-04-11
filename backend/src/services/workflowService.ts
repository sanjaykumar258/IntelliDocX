import prisma from '../utils/prisma';
import { Role, WorkflowStatus, ApprovalActionType, AuditAction } from '@prisma/client';
import { logAction } from './auditService';

export const createTemplate = async (
  name: string,
  organizationId: string,
  createdBy: string,
  steps: { order: number; requiredRole: Role; name: string; isFinal?: boolean; condition?: string }[],
  slaConfig?: { maxApprovalHours: number; escalationRole: Role }
) => {
  return await prisma.workflowTemplate.create({
    data: {
      name,
      organizationId,
      createdBy,
      steps: {
        create: steps.map((s) => ({
          order: s.order,
          requiredRole: s.requiredRole,
          name: s.name,
          isFinal: s.isFinal || false,
          condition: s.condition
        })),
      },
      slaConfig: slaConfig
        ? {
          create: {
            maxApprovalHours: slaConfig.maxApprovalHours,
            escalationRole: slaConfig.escalationRole,
          },
        }
        : undefined,
    },
    include: {
      steps: true,
      slaConfig: true,
    },
  });
};

export const getTemplates = async (organizationId: string) => {
  return await prisma.workflowTemplate.findMany({
    where: { organizationId },
    include: { steps: { orderBy: { order: 'asc' } }, slaConfig: true },
  });
};

export const getTemplateByName = async (name: string, organizationId: string) => {
  return await prisma.workflowTemplate.findFirst({
    where: { name, organizationId },
    include: { steps: true }
  });
};

import { eventBus, EVENTS } from '../events/eventBus';

export const startWorkflow = async (
  documentId: string,
  templateId: string,
  userId: string,
  organizationId: string
) => {
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
    include: { steps: { orderBy: { order: 'asc' } } }
  });

  if (!template) throw new Error('Template not found');

  const uploader = await prisma.user.findUnique({ where: { id: userId } });
  if (!uploader) throw new Error('User not found');

  // Logic: Employee -> Manager (Step 1), Manager -> Admin (Step 2)
  let initialStep = 1;
  if (uploader.role === Role.MANAGER) {
    // If manager uploads, skip manager step (usually step 1) and go to admin (step 2)
    // We look for the first step that requires ADMIN role
    const adminStep = template.steps.find(s => s.requiredRole === Role.ADMIN);
    if (adminStep) {
      initialStep = adminStep.order;
    }
  }

  const instance = await prisma.$transaction(async (tx) => {
    const inst = await tx.workflowInstance.create({
      data: {
        documentId,
        templateId,
        organizationId,
        currentStepIndex: initialStep,
        status: WorkflowStatus.PENDING,
        startedAt: new Date()
      },
      include: {
        template: { include: { steps: true } }
      }
    });

    await tx.workflowLog.create({
      data: {
        workflowInstanceId: inst.id,
        action: 'STARTED',
        toStatus: WorkflowStatus.PENDING,
        performedById: userId,
        comment: `Workflow started by ${uploader.role}`
      }
    });

    return inst;
  });

  await logAction(
    AuditAction.WORKFLOW_START,
    userId,
    organizationId,
    documentId
  );

  eventBus.emit(EVENTS.WORKFLOW_STARTED, {
    documentId,
    userId,
    organizationId,
    instanceId: instance.id,
    currentStepIndex: initialStep
  });

  return instance;
};

// Helper: Notification will be handled in event handlers or here directly
// User requested "Send notification to MANAGER/ADMIN" and "Send instant notification to original uploader"

export const processAction = async (
  instanceId: string,
  action: ApprovalActionType,
  comments: string | null,
  userId: string,
  role: Role,
  organizationId: string
) => {
  return await prisma.$transaction(async (tx) => {
    const instance = await tx.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        template: { include: { steps: true } },
        document: { select: { ownerId: true, title: true } }
      },
    });

    if (!instance) throw new Error('Workflow instance not found');
    if (instance.status !== WorkflowStatus.PENDING) throw new Error('Workflow is not in PENDING state');

    const currentStep = instance.template.steps.find(
      (s) => s.order === instance.currentStepIndex
    );

    if (!currentStep) throw new Error('Current step not found');

    // Role Validation — ADMIN/SUPER_ADMIN can override any step
    const isAdmin = role === Role.ADMIN || (role as string) === 'SUPER_ADMIN';
    if (!isAdmin && currentStep.requiredRole !== role) {
      throw new Error(`Unauthorized: Only ${currentStep.requiredRole} can perform this action at this step`);
    }

    if ((action as string) === 'ESCALATE') {
      const updatedInstance = await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: (WorkflowStatus as any).ESCALATED || 'ESCALATED',
        },
      });

      await tx.workflowLog.create({
        data: {
          workflowInstanceId: instanceId,
          action: 'ESCALATED',
          performedById: userId,
          comment: comments || 'Workflow escalated to administrator'
        }
      });

      eventBus.emit('workflow:escalated', {
        instanceId,
        documentId: instance.documentId,
        organizationId,
        performedBy: userId
      });

      return updatedInstance;
    }

    if (action === ApprovalActionType.REJECT) {
      const updatedInstance = await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: WorkflowStatus.REJECTED,
          completedAt: new Date(),
          approvalActions: {
            create: {
              stepId: currentStep.id,
              action: ApprovalActionType.REJECT,
              comment: comments,
              performedBy: userId,
            },
          },
        },
      });

      await tx.workflowLog.create({
        data: {
          workflowInstanceId: instanceId,
          action: 'REJECTED',
          fromStatus: WorkflowStatus.PENDING,
          toStatus: WorkflowStatus.REJECTED,
          performedById: userId,
          comment: comments
        }
      });

      eventBus.emit(EVENTS.WORKFLOW_REJECTED, {
        documentId: instance.documentId,
        userId,
        organizationId,
        instanceId,
        ownerId: instance.document.ownerId
      });

      return updatedInstance;
    }

    // Handle Approval
    let nextStepOrder = instance.currentStepIndex + 1;
    let nextStep = instance.template.steps.find(s => s.order === nextStepOrder);

    // Skip steps if condition exists (omitted for brevity, keeping original logic if needed)
    // For role-based flow, we assume sequential steps for now.

    if (!nextStep) {
      // Complete workflow
      const updatedInstance = await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: WorkflowStatus.APPROVED,
          completedAt: new Date(),
          approvalActions: {
            create: {
              stepId: currentStep.id,
              action: ApprovalActionType.APPROVE,
              comment: comments,
              performedBy: userId,
            },
          },
        },
      });

      await tx.workflowLog.create({
        data: {
          workflowInstanceId: instanceId,
          action: 'APPROVED_FINAL',
          fromStatus: WorkflowStatus.PENDING,
          toStatus: WorkflowStatus.APPROVED,
          performedById: userId,
          comment: comments
        }
      });

      eventBus.emit(EVENTS.WORKFLOW_APPROVED, {
        documentId: instance.documentId,
        userId,
        organizationId,
        instanceId,
        nextStep: null,
        ownerId: instance.document.ownerId
      });

      return updatedInstance;
    } else {
      // Move to next step
      const updatedInstance = await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          currentStepIndex: nextStep.order,
          approvalActions: {
            create: {
              stepId: currentStep.id,
              action: ApprovalActionType.APPROVE,
              comment: comments,
              performedBy: userId,
            },
          },
        },
      });

      await tx.workflowLog.create({
        data: {
          workflowInstanceId: instanceId,
          action: 'APPROVED_STEP',
          performedById: userId,
          comment: comments
        }
      });

      eventBus.emit(EVENTS.WORKFLOW_APPROVED, {
        documentId: instance.documentId,
        userId,
        organizationId,
        instanceId,
        nextStep: nextStep.order,
        nextRole: nextStep.requiredRole,
        ownerId: instance.document.ownerId
      });

      return updatedInstance;
    }
  });
};

export const getPendingWorkflows = async (organizationId: string, role: Role) => {
  // Find instances where current step requires this role
  // This requires joining steps.
  // Prisma doesn't support deep filtering easily on unrelated tables without raw query or careful include.
  // We fetch instances and filter in memory or use where logic if possible.

  // Logic: Instance -> Template -> Steps. Filter where Steps[currentStep].role == role

  // Improved query:
  const workflows = await prisma.workflowInstance.findMany({
    where: {
      status: WorkflowStatus.PENDING,
      document: { 
        organizationId,
        status: { not: 'DELETED' } // Filter out orphaned instances of deleted documents
      },
      template: {
        steps: {
          some: {
            requiredRole: role
          }
        }
      }
    },
    include: {
      template: { include: { steps: true, slaConfig: true } },
      document: { 
        include: {
          owner: { select: { id: true, name: true, email: true } },
          metadata: true
        }
      }
    }
  });

  // Client-side filter for precise step matching
  return workflows.filter(w => {
    const step = w.template.steps.find(s => s.order === w.currentStepIndex);
    return step && step.requiredRole === role;
  });
};

export const getWorkflowHistory = async (documentId: string) => {
  return await prisma.workflowInstance.findMany({
    where: { documentId },
    include: {
      approvalActions: { orderBy: { performedAt: 'desc' } },
      template: true
    },
    orderBy: { startedAt: 'desc' }
  });
};
