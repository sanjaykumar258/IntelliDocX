// Test the text extractor fix with a real PDF from MinIO
const { getFileStream } = require('./src/storage/minioClient');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testExtractor() {
    try {
        // Get docs from DB
        const docs = await prisma.document.findMany({
            include: { versions: { take: 1, orderBy: { versionNumber: 'desc' } } }
        });

        if (docs.length === 0) {
            console.log('No documents found!');
            return;
        }

        for (const doc of docs) {
            const storagePath = doc.versions[0]?.storagePath;
            if (!storagePath) { console.log(`${doc.fileName}: no storagePath`); continue; }

            console.log(`\n--- Testing: ${doc.fileName} ---`);
            console.log(`Storage: ${storagePath}`);

            try {
                // Get file from MinIO
                const fileStream = await getFileStream(storagePath);
                const chunks = [];
                for await (const chunk of fileStream) {
                    chunks.push(Buffer.from(chunk));
                }
                const fileBuffer = Buffer.concat(chunks);
                console.log(`File size: ${fileBuffer.length} bytes`);

                // Test pdf-parse v2
                const { PDFParse } = require('pdf-parse');
                const uint8 = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
                const parser = new PDFParse(uint8);
                await parser.load();
                const text = await parser.getText();
                console.log(`Extracted ${text.length} chars`);
                console.log(`Preview: ${text.substring(0, 200)}...`);
                parser.destroy();
            } catch (e) {
                console.error(`FAILED: ${e.message}`);
            }
        }
    } catch (e) {
        console.error('Fatal:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testExtractor();
