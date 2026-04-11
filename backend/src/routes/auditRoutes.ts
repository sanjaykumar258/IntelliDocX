import { Router, Response } from 'express';
import { analyticsController } from '../analytics/analyticsController';
import { requireMinRole } from '../middleware/rbac';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireMinRole('MANAGER'));

// List audit logs with filters
router.get('/', analyticsController.getAuditLogs);

// Export audit logs as CSV
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { userId, actionType, startDate, endDate, documentId } = req.query as any;

    const where: any = { organization: { id: user.organizationId } };
    if (userId) where.userId = userId;
    if (actionType) where.actionType = actionType;
    if (documentId) where.documentId = documentId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: 10000,
    });

    // Generate CSV
    const headers = 'ID,Action,User Email,User Role,Document ID,IP Address,Timestamp\n';
    const rows = logs.map(l =>
      `${l.id},${l.actionType},${l.user.email},${l.user.role},${l.documentId || ''},${l.ipAddress || ''},${l.timestamp.toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    res.send(headers + rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
