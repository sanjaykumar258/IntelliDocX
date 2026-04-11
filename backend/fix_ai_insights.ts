import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const metadatas = await prisma.documentMetadata.findMany({
    where: { category: 'AI_INSIGHT' }
  });

  console.log(`Found ${metadatas.length} AI_INSIGHT metadata records to fix.`);

  for (const meta of metadatas) {
    if (meta.customFields && typeof meta.customFields === 'object') {
      const customFields = meta.customFields as Record<string, any>;
      // If the parent category is currently wrong, fix it
      if (customFields.parentCategory === 'OTHER') {
        customFields.parentCategory = 'AI_INSIGHTS';
        
        await prisma.documentMetadata.update({
          where: { id: meta.id },
          data: { customFields }
        });
        console.log(`Updated parent category for documentId: ${meta.documentId}`);
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
