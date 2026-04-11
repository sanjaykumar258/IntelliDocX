import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
    try {
        const id = 'd33fdf1d-0d5a-4891-aba1-69898e28ff1b';

        // What fails?
        // 1. AuditLog Check
        const aCount = await prisma.auditLog.count({ where: { documentId: id }});
        console.log('AuditLog Count:', aCount);

        // 2. WorkflowInstance check
        const wfCount = await prisma.workflowInstance.count({ where: { documentId: id }});
        console.log('WorkflowInstance count:', wfCount);

        if (wfCount > 0) {
            const res = await prisma.workflowInstance.deleteMany({ where: { documentId: id }});
            console.log('Deleted WF:', res.count);
        }

        // Wait... DOES deleteMany actually drop them?
        await prisma.documentMetadata.deleteMany({ where: { documentId: id } });
        await prisma.documentVersion.deleteMany({ where: { documentId: id } });
        await prisma.documentShare.deleteMany({ where: { documentId: id } });
        await prisma.documentComment.deleteMany({ where: { documentId: id } });

        await prisma.auditLog.updateMany({
           where: { documentId: id },
           data: { documentId: null }
        });

        // Finally delete the document
        await prisma.document.delete({ where: { id } });
        console.log('Deletion Successful');
    } catch(e) {
        console.error('ERROR TRACE:', e);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
