import { PrismaClient } from '@prisma/client';
import { getFileStream } from './src/storage/minioClient';

const prisma = new PrismaClient();

async function testExtractor() {
    try {
        const docs = await prisma.document.findMany({
            include: { versions: { take: 1, orderBy: { versionNumber: 'desc' as const } } }
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
                const fileStream = await getFileStream(storagePath);
                const chunks: Buffer[] = [];
                for await (const chunk of fileStream) {
                    chunks.push(Buffer.from(chunk));
                }
                const fileBuffer = Buffer.concat(chunks);
                console.log(`File size: ${fileBuffer.length} bytes`);

                const { PDFParse } = require('pdf-parse');
                const uint8 = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
                const parser = new PDFParse(uint8);
                await parser.load();
                const text = await parser.getText();
                console.log(`Extracted ${text.length} chars`);
                console.log(`Preview: ${text.substring(0, 300)}...`);
                parser.destroy();
            } catch (e: any) {
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
