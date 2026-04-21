import prisma from '../utils/prisma';
import { classifyDocument } from '../services/documentClassifier.service';

async function reclassifyAll() {
  console.log('═══ Starting Document Reclassification ═══\n');

  const docs = await prisma.document.findMany({
    where: { status: { not: 'DELETED' } },
    select: {
      id: true,
      title: true,
      fileName: true,
      extractedText: true,
    },
  });

  console.log(`Found ${docs.length} documents to reclassify.\n`);

  let updated = 0;
  for (const doc of docs) {
    try {
        const text = doc.extractedText || '';
        const fileName = doc.fileName || doc.title || '';
        
        // Run new classification logic
        const result = await classifyDocument(text, fileName);
        
        // Update document
        await prisma.document.update({
            where: { id: doc.id },
            data: { category: result.category }
        });

        // Update metadata
        await prisma.documentMetadata.updateMany({
            where: { documentId: doc.id },
            data: { 
                category: result.category,
                department: result.department,
            }
        });

        console.log(`[OK] ${fileName.substring(0, 40).padEnd(40)} -> ${result.category} (Confidence: ${result.confidence})`);
        updated++;
    } catch (err: any) {
        console.error(`[FAIL] ${doc.title} - ${err.message}`);
    }
  }

  console.log(`\n═══ Reclassification Complete ═══`);
  console.log(`Successfully updated: ${updated}/${docs.length}`);

  await prisma.$disconnect();
  process.exit(0);
}

reclassifyAll().catch(e => {
  console.error(e);
  process.exit(1);
});
