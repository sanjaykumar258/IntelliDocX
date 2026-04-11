const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const n = await prisma.notification.findMany();
  console.log(n);
}

main().finally(() => prisma.$disconnect());
