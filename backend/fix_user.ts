import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'employee@acme.com' }
  });

  if (user) {
    if (user.id !== '90331559-b920-480f-87ed-503a3bcb6187') {
      try {
        await prisma.$executeRaw`UPDATE "User" SET id = '90331559-b920-480f-87ed-503a3bcb6187' WHERE email = 'employee@acme.com'`;
        console.log('Successfully updated employee ID to match the JWT token.');
      } catch (e: any) {
        console.error('Failed to update ID via SQL', e);
      }
    } else {
      console.log('Employee ID already matches.');
    }
  } else {
    console.log('Employee user not found!');
  }
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
