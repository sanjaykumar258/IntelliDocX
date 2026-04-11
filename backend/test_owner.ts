import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
    try {
        const docs = await prisma.document.findMany({ select: { id: true, title: true, fileName: true, owner: { select: { id: true, email: true, role: true } } } }); 
        console.log(JSON.stringify(docs, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
})();
