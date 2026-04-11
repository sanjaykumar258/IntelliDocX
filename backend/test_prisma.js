const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wfs = await prisma.workflowInstance.findMany({
    include: { template: { include: { steps: true } } }
  });
  console.log(JSON.stringify(wfs.map(w => ({
    id: w.id,
    currentStepIndex: w.currentStepIndex,
    status: w.status,
    steps: w.template.steps.map(s => s.order)
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
