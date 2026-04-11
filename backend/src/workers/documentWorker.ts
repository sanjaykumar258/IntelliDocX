import { Worker } from 'bullmq';
import { aiClientService } from '../services/aiClientService';
import { classifyDocument, SUB_TO_PARENT } from '../services/documentClassifier.service';
import { extractText } from '../services/textExtractor.service';
import * as documentService from '../services/documentService';
import * as workflowService from '../services/workflowService';
import prisma from '../utils/prisma';
import Logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

import redisClient from '../utils/redis';
import { getFileStream } from '../storage/minioClient';

export let documentWorker: Worker | null = null;

setTimeout(() => {
  if (redisClient.isOpen) {
    documentWorker = new Worker('document-processing', async job => {
      const { documentId, filePath, organizationId, title, fileName } = job.data;
      Logger.info(`[Worker] Processing document ${documentId}`);

      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { processingStatus: 'PROCESSING' }
        });

        // ═══ PHASE 1: Try AI Service first ═══
        let result: any = null;
        let aiServiceAvailable = false;

        const t0 = Date.now();
        try {
          result = await aiClientService.processDocument(documentId, organizationId, filePath, title, fileName);
          // Check if it's a real result or a fallback (Python rules engine returns < 0.6)
          if (result && result.category && result.category !== 'Uncategorized' && result.confidence >= 0.60) {
            aiServiceAvailable = true;
            Logger.info(`[Worker] AI Service processed in ${(Date.now() - t0) / 1000}s — Category: ${result.category}, Confidence: ${result.confidence}`);
          }
        } catch (e) {
          Logger.warn(`[Worker] AI Service unavailable, using local classifier`);
        }

        // ═══ PHASE 2: Local intelligent classifier fallback ═══
        if (!aiServiceAvailable) {
          Logger.info(`[Worker] Running local intelligent classifier for "${fileName}"...`);
          
          // Extract text from document
          let extractedText = '';
          try {
            // Get file from MinIO storage
            const fileStream = await getFileStream(filePath);
            const chunks: Buffer[] = [];
            for await (const chunk of fileStream) {
              chunks.push(Buffer.from(chunk));
            }
            const fileBuffer = Buffer.concat(chunks);
            
            // Determine mime type from file extension
            const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
            const mimeMap: Record<string, string> = {
              'pdf': 'application/pdf',
              'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
              'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'txt': 'text/plain', 'csv': 'text/csv',
            };
            const mimeType = mimeMap[ext] || 'application/octet-stream';
            
            extractedText = await extractText(fileBuffer, mimeType);
            Logger.info(`[Worker] Extracted ${extractedText.length} chars from document`);
          } catch (e: any) {
            Logger.warn(`[Worker] Text extraction failed: ${e.message}. Using filename-only classification.`);
          }
          
          // Run enhanced classifier
          const classification = await classifyDocument(extractedText, fileName);
          
          result = {
            category: classification.category,
            confidence: classification.confidence,
            department: classification.department,
            tags: classification.tags,
            extractedData: classification.extractedFields,
            parentCategory: classification.parentCategory,
            subCategory: classification.subCategory,
          };
          
          Logger.info(`[Worker] Local classifier result: ${result.category} (${result.parentCategory}) @ ${(result.confidence * 100).toFixed(1)}% confidence`);

          // Store extracted text for search
          if (extractedText && extractedText.length > 0) {
            try {
              await prisma.document.update({
                where: { id: documentId },
                data: { extractedText: extractedText.slice(0, 50000) }
              });
            } catch (e) {
              Logger.warn(`[Worker] Failed to store extracted text`);
            }
          }
        }

        // ═══ PHASE 3: Run Advanced AI Suite (if available) ═══
        let summaryResult = { summary: 'AI Service unavailable', keyPoints: [], wordCount: 0 };
        let complianceResult = { riskLevel: 'UNKNOWN', riskScore: 0, findings: [], checkedRules: 0 };
        let aiDetectResult = { isAiGenerated: false, confidence: 0, indicators: [], scores: {} };
        let relationshipsResult = { relatedDocuments: [], totalFound: 0 };

        if (aiServiceAvailable) {
          try {
            const tAiSuite = Date.now();
            [summaryResult, complianceResult, aiDetectResult, relationshipsResult] = await Promise.all([
              aiClientService.summarize(documentId, organizationId, title),
              aiClientService.checkCompliance(documentId, organizationId, result.category),
              aiClientService.detectAi(documentId, organizationId),
              aiClientService.getRelationships(documentId, organizationId, 5)
            ]);
            Logger.info(`[Worker] Advanced AI Suite took: ${(Date.now() - tAiSuite) / 1000}s`);
          } catch (e) {
            Logger.warn(`[Worker] Advanced AI Suite partially failed`);
          }
        }

        // ═══ PHASE 4: Update Document ═══
        if (result.category) {
          // Normalize: uppercase + replace spaces with underscores so it matches CATEGORY_GROUPS keys
          result.category = result.category.toUpperCase().replace(/\s+/g, '_');
        }
        await documentService.updateDocument(documentId, {
          processingStatus: 'COMPLETED',
          category: result.category,
          confidence: result.confidence
        });

        // ═══ PHASE 5: Update Metadata ═══
        const t1 = Date.now();
        const catUpper = (result.category || '').toUpperCase().replace(/\s+/g, '_');
        const richMetadata: Record<string, any> = {
          ...(result.extractedData || {}),
          parentCategory: result.parentCategory || SUB_TO_PARENT[catUpper] || 'OTHER',
          subCategory: result.subCategory || result.category,
          classifiedBy: aiServiceAvailable ? 'AI_SERVICE' : 'LOCAL_CLASSIFIER',
          classifiedAt: new Date().toISOString(),
        };

        // Only include AI suite results if they have meaningful data
        if (aiServiceAvailable) {
          richMetadata.aiSummary = summaryResult;
          richMetadata.aiCompliance = complianceResult;
          richMetadata.aiDetector = aiDetectResult;
          richMetadata.relatedDocuments = relationshipsResult;
        }

        await prisma.documentMetadata.upsert({
          where: { documentId },
          create: {
            documentId,
            department: result.department || 'General',
            category: result.category,
            tags: result.tags || ['auto-processed'],
            customFields: richMetadata
          },
          update: {
            department: result.department === 'General' ? undefined : result.department,
            category: result.category === 'Uncategorized' || result.category === 'OTHER' ? undefined : result.category,
            tags: result.tags || ['auto-processed'],
            customFields: richMetadata
          }
        });
        Logger.info(`[Worker] Metadata update took: ${(Date.now() - t1) / 1000}s`);

        // ═══ PHASE 6: Trigger Workflow ═══
        try {
          let templateName = 'Standard Approval Process';
          const normalizedCategory = result.category?.toUpperCase() || 'GENERAL';
          const parentCat = result.parentCategory?.toUpperCase() || SUB_TO_PARENT[normalizedCategory] || 'OTHER';
          
          if (parentCat === 'INVOICES' || normalizedCategory === 'INVOICE') templateName = 'Invoice Approval';
          else if (parentCat === 'CONTRACTS' || normalizedCategory === 'CONTRACT' || normalizedCategory === 'NDA') templateName = 'Contract Review';
          else if (parentCat === 'HR' || normalizedCategory === 'OFFER_LETTER' || normalizedCategory === 'PAYSLIP') templateName = 'HR Policy Approval';
          else if (parentCat === 'LEGAL') templateName = 'Legal Review';

          let template = await workflowService.getTemplateByName(templateName, organizationId);
          
          if (!template && templateName !== 'Standard Approval Process') {
            Logger.info(`[Worker] Specific template '${templateName}' not found, falling back to 'Standard Approval Process'`);
            template = await workflowService.getTemplateByName('Standard Approval Process', organizationId);
          }

          if (template) {
            const doc = await prisma.document.findUnique({ where: { id: documentId } });
            if (doc) {
              const existing = await prisma.workflowInstance.findFirst({
                where: { documentId, templateId: template.id }
              });
              
              if (!existing) {
                await workflowService.startWorkflow(documentId, template.id, doc.ownerId, organizationId);
                Logger.info(`[Worker] Auto-started workflow '${template.name}' for document ${documentId}`);
              }
            }
          }
        } catch (e) {
          Logger.error(`[Worker] Failed to auto-start workflow for document ${documentId}: ${e}`);
        }

        Logger.info(`[Worker] ✅ Document ${documentId} processed successfully — ${result.category} @ ${(result.confidence * 100).toFixed(1)}%`);

        // Emit socket event so the frontend can instantly refresh the document list
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { io: appIo }: any = require('../app');
          appIo.to(`org:${organizationId}`).emit('document:categorized', {
            documentId,
            category: result.category,
            confidence: result.confidence,
          });
        } catch (socketErr) {
          Logger.warn('[Worker] Failed to emit socket event: ' + socketErr);
        }

      } catch (error: any) {
        Logger.error(`[Worker] Failed to process document ${documentId}: ${error.message}`);
        await documentService.updateDocument(documentId, {
          processingStatus: 'FAILED'
        });
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { io: appIo }: any = require('../app');
          appIo.to(`org:${organizationId}`).emit('document:categorized', {
            documentId,
            category: 'OTHER',
            confidence: 0,
          });
        } catch (_) {}
      }
    }, { connection });
    
    documentWorker.on('error', err => {
      Logger.error(`[Worker] Worker error (handled gracefully): ${err.message}`);
    });
    Logger.info('[Worker] BullMQ Worker started successfully');
  } else {
    Logger.warn('[Worker] Redis is unavailable. BullMQ Document Worker is DISABLED.');
  }
}, 2000);
