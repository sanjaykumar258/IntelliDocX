import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest2() {
    try {
        const id = '17724bf4-1c08-4912-8dbb-ab8ca1981888';

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

        console.log('Transaction Deletion Successful');
    } catch(e) {
        console.error('ERROR TRACE:', e);
    } finally {
        await prisma.$disconnect();
    }
}

runTest2();
