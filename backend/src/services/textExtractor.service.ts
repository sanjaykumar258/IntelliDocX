import Logger from '../utils/logger';

export const extractText = async (buffer: Buffer, mimeType: string): Promise<string> => {
    try {
        Logger.info(`[TextExtractor] Extracting text for mime: ${mimeType}`);

        if (mimeType === 'application/pdf') {
            Logger.info('[TextExtractor] Using pdf-parse v2 (PDFParse class)...');
            const { PDFParse } = require('pdf-parse');
            // pdf-parse v2 requires Uint8Array, not Buffer
            const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            const parser = new PDFParse(uint8);
            await parser.load();
            const result = await parser.getText();
            const text = typeof result === 'string' ? result : (result?.text || '');
            Logger.info(`[TextExtractor] PDF text extracted: ${text.length} chars`);
            parser.destroy();
            return normalizeText(text);
        }

        if (mimeType.startsWith('image/')) {
            Logger.info('[TextExtractor] Loading Tesseract for image OCR...');
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng');
            const { data: { text } } = await worker.recognize(buffer);
            await worker.terminate();
            return normalizeText(text);
        }

        Logger.warn(`[TextExtractor] Unsupported mime type for text extraction: ${mimeType}`);
        return '';
    } catch (error: any) {
        Logger.error(`[TextExtractor] Error extracting text: ${error.message}`);
        return '';
    }
};

const normalizeText = (text: string): string => {
    return text
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim()
        .slice(0, 100000); // Limit length to prevent DB issues
};
