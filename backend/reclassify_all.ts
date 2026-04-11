import { PrismaClient } from '@prisma/client';
import { classifyDocument } from './src/services/documentClassifier.service';

const prisma = new PrismaClient();

async function run() {
    console.log('Fetching documents...');
    const documents = await prisma.document.findMany({
        include: { metadata: true }
    });

    console.log(`Found ${documents.length} documents. Reclassifying...`);
    let updated = 0;

    for (const doc of documents) {
        if (!doc.metadata) continue;

        // Try to get text from somewhere. If no text, we just pass the title which should now trigger filename boost.
        // In a real scenario, the worker would have stored extracted text, but we don't store it in DB directly.
        // We will just re-run with title and simulate empty text.
        
        const text = Object.values(doc.metadata.customFields || {}).join(' '); // A rough approximation if we had any text

        const classification = await classifyDocument(text, doc.title);
        
        console.log(`[Updating] ${doc.title}: ${classification.category}`);
        
        await prisma.document.update({
            where: { id: doc.id },
            data: {
                category: classification.category,
                confidence: classification.confidence
            }
        });

            await prisma.documentMetadata.update({
                where: { documentId: doc.id },
                data: {
                    category: classification.category,
                    tags: classification.tags,
                    customFields: {
                        ...(doc.metadata.customFields as any),
                        ...classification.extractedFields,
                        subCategory: classification.subCategory,
                        parentCategory: classification.parentCategory
                    }
                }
            });
            updated++;
    }

    console.log(`Successfully updated ${updated} documents.`);
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
