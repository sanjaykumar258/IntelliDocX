import prisma from '../utils/prisma';
import redisClient from '../utils/redis';
import { DocumentStatus, WorkflowStatus, ApprovalActionType } from '@prisma/client';

const CACHE_TTL = 300; // 5 minutes

export class AnalyticsService {

    private async getOrSetCache<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
        return await fetchFn();
    }

    async getDocumentMetrics(organizationId: string) {
        return this.getOrSetCache(`analytics:docs:${organizationId}`, async () => {
            const totalDocs = await prisma.document.count({
                where: { organizationId, status: { not: DocumentStatus.DELETED } }
            });

            const storageStats = await prisma.document.aggregate({
                where: { organizationId, status: { not: DocumentStatus.DELETED } },
                _sum: { fileSize: true }
            });

            const totalVersions = await prisma.documentVersion.count({
                where: { document: { organizationId } }
            });

            // Uploads trends - last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const uploads = await prisma.document.groupBy({
                by: ['createdAt'],
                where: {
                    organizationId,
                    createdAt: { gte: sevenDaysAgo }
                },
                _count: { id: true }
            });

            // Group by day manually since Prisma groupBy returns Date objects
            const trendMap: Record<string, number> = {};
            uploads.forEach(u => {
                const day = u.createdAt.toISOString().split('T')[0];
                trendMap[day] = (trendMap[day] || 0) + u._count.id;
            });

            // Documents by category (global)
            const docsByCategory = await prisma.document.groupBy({
                by: ['category'],
                where: { organizationId, status: { not: DocumentStatus.DELETED } },
                _count: { id: true }
            });

            return {
                totalDocuments: totalDocs,
                totalStorageBytes: storageStats._sum.fileSize || 0,
                averageVersions: totalDocs > 0 ? Number((totalVersions / totalDocs).toFixed(1)) : 0,
                uploadTrend: trendMap,
                categoryDistribution: docsByCategory.map(c => ({
                    category: c.category || 'Uncategorized',
                    count: c._count.id
                }))
            };
        });
    }

    async getWorkflowMetrics(organizationId: string) {
        return this.getOrSetCache(`analytics:workflows:${organizationId}`, async () => {
            const pendingCount = await prisma.workflowInstance.count({
                where: {
                    document: { organizationId },
                    status: WorkflowStatus.PENDING
                }
            });

            const slaBreaches = await prisma.workflowInstance.count({
                where: {
                    document: { organizationId },
                    status: WorkflowStatus.ESCALATED
                }
            });

            const actions = await prisma.approvalAction.groupBy({
                by: ['action'],
                where: { workflowInstance: { document: { organizationId } } },
                _count: { id: true }
            });

            const approvedCount = actions.find(a => a.action === ApprovalActionType.APPROVE)?._count.id || 0;
            const rejectedCount = actions.find(a => a.action === ApprovalActionType.REJECT)?._count.id || 0;
            const totalActions = approvedCount + rejectedCount;

            // Average Approval Time (Completed workflows)
            const completedWorkflows = await prisma.workflowInstance.findMany({
                where: {
                    document: { organizationId },
                    status: { in: [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED] },
                    completedAt: { not: null }
                },
                select: { startedAt: true, completedAt: true }
            });

            let totalTimeMs = 0;
            completedWorkflows.forEach(wf => {
                if (wf.completedAt) {
                    totalTimeMs += (wf.completedAt.getTime() - wf.startedAt.getTime());
                }
            });

            const avgTimeHours = completedWorkflows.length > 0
                ? (totalTimeMs / completedWorkflows.length) / (1000 * 60 * 60)
                : 0;

            return {
                pendingWorkflows: pendingCount,
                slaBreaches,
                approvalRate: totalActions > 0 ? Number((approvedCount / totalActions * 100).toFixed(1)) : 0,
                rejectionRate: totalActions > 0 ? Number((rejectedCount / totalActions * 100).toFixed(1)) : 0,
                avgCompletionTimeHours: Number(avgTimeHours.toFixed(2))
            };
        });
    }

    async getUserMetrics(organizationId: string) {
        return this.getOrSetCache(`analytics:users:${organizationId}`, async () => {
            // Most active users
            const activeUsers = await prisma.activityLog.groupBy({
                by: ['actorId'],
                where: { organizationId },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            });

            // Need to fetch user details manually
            const userIds = activeUsers.map(u => u.actorId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, email: true }
            });

            const topUsers = activeUsers.map(u => {
                const user = users.find(usr => usr.id === u.actorId);
                return {
                    name: user?.name || 'Unknown',
                    email: user?.email || '',
                    actionCount: u._count.id
                };
            });

            // Actions per Department
            // Since User model doesn't strictly link to Department (it's in Metadata), we infer from Metadata via Document actions if possible,
            // but ActivityLog links to Actor. Actor -> User -> Organization.
            // Department info is on DocumentMetadata.
            // Simplified: Group documents by department and count actions on them?
            // Or just return upload counts by department.

            // Let's do: Document count by department
            // This is actually a document metric but fits "department activity"
            const docsByDept = await prisma.documentMetadata.groupBy({
                by: ['department'],
                where: { document: { organizationId } },
                _count: { documentId: true }
            });

            const departmentStats = docsByDept.reduce((acc: Record<string, number>, curr) => {
                if (curr.department) {
                    acc[curr.department] = curr._count.documentId;
                }
                return acc;
            }, {});

            // Daily Active Users (Last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Prisma doesn't support distinct count in groupBy easily for DAU logic in one query.
            // We'll approximate by counting unique actorIds per day from activity logs.
            const logs = await prisma.activityLog.findMany({
                where: {
                    organizationId,
                    createdAt: { gte: sevenDaysAgo }
                },
                select: { actorId: true, createdAt: true }
            });

            const dauMap: Record<string, Set<string>> = {};
            logs.forEach(log => {
                const day = log.createdAt.toISOString().split('T')[0];
                if (!dauMap[day]) dauMap[day] = new Set();
                dauMap[day].add(log.actorId);
            });

            const dauStats: Record<string, number> = {};
            Object.keys(dauMap).forEach(day => {
                dauStats[day] = dauMap[day].size;
            });

            return {
                topActiveUsers: topUsers,
                departmentStats,
                dailyActiveUsers: dauStats
            };
        });
    }

    async getAIMetrics(organizationId: string) {
        return this.getOrSetCache(`analytics:ai:${organizationId}`, async () => {
            const indexedDocs = await prisma.documentMetadata.count({
                where: { document: { organizationId } }
            });

            // Assuming all indexed docs underwent OCR/AI processing
            // In a real system we'd track processing events specifically.

            // We can also count specific tags distribution
            // Limitation: Prisma doesn't easily unroll array fields for aggregation (tags).

            return {
                documentsIndexed: indexedDocs,
                ocrProcessedCount: indexedDocs, // Approximation
            };
        });
    }

    async getBlockchainMetrics(organizationId: string) {
        return this.getOrSetCache(`analytics:blockchain:${organizationId}`, async () => {
            const registeredCount = await prisma.documentVersion.count({
                where: {
                    document: { organizationId },
                    blockchainTxHash: { not: null }
                }
            });

            const verifiedDocs = await prisma.document.count({
                where: {
                    organizationId,
                    lastVerifiedAt: { not: null }
                }
            });

            const latestActivity = await prisma.documentVersion.findMany({
                where: {
                    document: { organizationId },
                    blockchainTxHash: { not: null }
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { document: { select: { title: true } } }
            });

            return {
                totalRegisteredOnChain: registeredCount,
                verifiedDocumentsCount: verifiedDocs,
                latestActivity: latestActivity.map(v => ({
                    document: v.document.title,
                    txHash: v.blockchainTxHash,
                    timestamp: v.createdAt
                }))
            };
        });
    }

    async getPersonalMetrics(userId: string, organizationId: string) {
        return this.getOrSetCache(`analytics:personal:${userId}`, async () => {
            const myDocs = await prisma.document.count({
                where: { ownerId: userId, organizationId, status: { not: DocumentStatus.DELETED } }
            });

            const myPendingWorkflows = await prisma.workflowInstance.count({
                where: {
                    document: { organizationId, ownerId: userId },
                    status: WorkflowStatus.PENDING
                }
            });

            // Find documents owned by user
            const myDocumentIds = await prisma.document.findMany({
                where: { ownerId: userId, organizationId },
                select: { id: true }
            }).then(docs => docs.map(d => d.id));

            // Find workflows for my documents
            const myInstanceIds = await prisma.workflowInstance.findMany({
                where: { documentId: { in: myDocumentIds } },
                select: { id: true }
            }).then(instances => instances.map(i => i.id));

            // Recent activity for this user and their documents
            const recentActivityRaw = await prisma.activityLog.findMany({
                where: {
                    organizationId,
                    OR: [
                        { actorId: userId },
                        { entityType: 'DOCUMENT', entityId: { in: myDocumentIds } },
                        { entityType: 'WORKFLOW', entityId: { in: myInstanceIds } }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    actor: { select: { name: true } }
                }
            });

            // Enrich with document names for DOCUMENT and WORKFLOW entity types
            const recentActivity = await Promise.all(recentActivityRaw.map(async (log) => {
                let documentName = '';
                if (log.entityType === 'DOCUMENT') {
                    const doc = await prisma.document.findFirst({
                        where: { id: log.entityId },
                        select: { title: true, fileName: true }
                    });
                    documentName = doc?.title || doc?.fileName || '';
                } else if (log.entityType === 'WORKFLOW') {
                    const instance = await prisma.workflowInstance.findUnique({
                        where: { id: log.entityId },
                        include: { document: { select: { title: true, fileName: true } } }
                    });
                    documentName = instance?.document?.title || instance?.document?.fileName || '';
                }
                return {
                    action: log.action,
                    documentName,
                    timestamp: log.createdAt
                };
            }));

            // Documents by category (personal)
            const docsByCategory = await prisma.document.groupBy({
                by: ['category'],
                where: { ownerId: userId, organizationId, status: { not: DocumentStatus.DELETED } },
                _count: { id: true }
            });

            // Storage used by this user's documents
            const storageStats = await prisma.document.aggregate({
                where: { ownerId: userId, organizationId, status: { not: DocumentStatus.DELETED } },
                _sum: { fileSize: true }
            });
            const myStorageBytes = storageStats._sum.fileSize || 0;

            const myApprovedWorkflows = await prisma.workflowInstance.count({
                where: {
                    document: { organizationId, ownerId: userId },
                    status: WorkflowStatus.APPROVED
                }
            });

            return {
                myDocumentsCount: myDocs,
                myPendingWorkflows: myPendingWorkflows,
                myApprovedWorkflows: myApprovedWorkflows,
                recentActivity,
                myStorageBytes,
                categoryDistribution: docsByCategory.map(c => ({
                    category: c.category || 'Uncategorized',
                    count: c._count.id
                }))
            };
        });
    }

    async getGlobalRecentActivity(organizationId: string) {
        return this.getOrSetCache(`analytics:activity:global:${organizationId}`, async () => {
            const logs = await prisma.activityLog.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
                take: 8,
                include: {
                    actor: { select: { name: true } }
                }
            });

            // Batch fetch document info for DOCUMENT and WORKFLOW entity types
            const docLogs = logs.filter(l => l.entityType === 'DOCUMENT');
            const workflowLogs = logs.filter(l => l.entityType === 'WORKFLOW');

            const docIdsFromDocs = docLogs.map(l => l.entityId);

            // For workflow logs, we need to map instanceId -> documentId
            const workflowInstances = workflowLogs.length > 0
                ? await prisma.workflowInstance.findMany({
                    where: { id: { in: workflowLogs.map(l => l.entityId) } },
                    select: { id: true, document: { select: { id: true, title: true, fileName: true } } }
                })
                : [];

            const instanceMap = new Map(workflowInstances.map(i => [i.id, i.document]));
            const docIdsFromWorkflows = workflowInstances.map(i => i.document?.id).filter(Boolean);

            const allDocIds = Array.from(new Set([...docIdsFromDocs, ...(docIdsFromWorkflows as string[])]));

            const docs = allDocIds.length > 0
                ? await prisma.document.findMany({
                    where: { id: { in: allDocIds } },
                    select: { id: true, title: true, fileName: true }
                })
                : [];

            const docMap = new Map(docs.map(d => [d.id, d]));

            return logs.map(log => {
                let doc = null;
                if (log.entityType === 'DOCUMENT') {
                    doc = docMap.get(log.entityId);
                } else if (log.entityType === 'WORKFLOW') {
                    doc = instanceMap.get(log.entityId);
                }

                return {
                    action: log.action,
                    documentName: doc?.title || doc?.fileName || '',
                    actorName: log.actor?.name || 'System',
                    timestamp: log.createdAt
                };
            });
        });
    }
}

export const analyticsService = new AnalyticsService();
