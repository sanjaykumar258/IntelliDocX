const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.workflowInstance.updateMany({
    where: { currentStepIndex: 0 },
    data: { currentStepIndex: 1 }
  });
  console.log(`Updated ${res.count} workflow instances.`);
}

main().finally(() => prisma.$disconnect());
