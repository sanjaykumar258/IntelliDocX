import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('Clearing pending approvals...');
    const result = await prisma.actionApproval.deleteMany();
    console.log(`Cleared ${result.count} pending generic approvals.`);
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
