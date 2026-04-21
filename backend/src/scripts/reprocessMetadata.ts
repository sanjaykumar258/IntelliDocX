/**
 * ONE-TIME REPROCESS SCRIPT v2
 * Updates all existing documents with typed 6-field metadata.
 * Run: docker exec intellidocx-backend npx ts-node src/scripts/reprocessMetadata.ts
 */

import prisma from '../utils/prisma';
import { extractTypedMetadata } from '../services/metadataExtractor';

async function reprocessAll() {
  console.log('═══ Starting Metadata Reprocessing v2 ═══\n');

  const docs = await prisma.document.findMany({
    where: { status: { not: 'DELETED' } },
    select: {
      id: true,
      title: true,
      fileName: true,
      category: true,
      extractedText: true,
      metadata: { select: { id: true, customFields: true, department: true, tags: true, category: true } },
    },
  });

  console.log(`Found ${docs.length} documents to reprocess.\n`);

  let fixed = 0;
  let skipped = 0;

  for (const doc of docs) {
    const text = doc.extractedText || '';
    const category = doc.category || doc.metadata?.category || 'OTHER';
    const fileName = doc.fileName || doc.title || '';

    try {
      const typedMeta = extractTypedMetadata(text, category, fileName);

      // Merge into existing customFields
      const existingCustom: Record<string, any> = (doc.metadata?.customFields as any) || {};
      existingCustom.typedMeta = typedMeta;

      if (doc.metadata?.id) {
        await prisma.documentMetadata.update({
          where: { id: doc.metadata.id },
          data: { customFields: existingCustom },
        });
      } else {
        await prisma.documentMetadata.create({
          data: {
            documentId: doc.id,
            department: 'General',
            category: category,
            tags: ['auto-processed'],
            customFields: { typedMeta } as any,
          },
        });
      }

      const fieldCount = Object.keys(typedMeta).length;
      const extractedCount = Object.values(typedMeta).filter((f: any) => !f.isFallback).length;
      console.log(`OK    ${doc.title.substring(0, 45).padEnd(45)} | ${category.padEnd(22)} | ${extractedCount}/${fieldCount} fields`);
      fixed++;
    } catch (err: any) {
      console.error(`FAIL  ${doc.title.substring(0, 45)} | ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n═══ Reprocessing Complete ═══`);
  console.log(`Fixed: ${fixed}  |  Skipped: ${skipped}  |  Total: ${docs.length}`);

  await prisma.$disconnect();
  process.exit(0);
}

reprocessAll().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
