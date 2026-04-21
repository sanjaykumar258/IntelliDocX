import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiClientService } from '../services/aiClientService';
import Logger from '../utils/logger';
import prisma from '../utils/prisma';

export const systemChat = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ status: 'error', message: 'Message is required' });
    }

    const aiResponse = await aiClientService.systemChat(
      user.organizationId,
      message,
      history || []
    );

    res.json({
      status: 'success',
      data: aiResponse
    });

  } catch (error: any) {
    Logger.error(`System Chat Error: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to process chat' });
  }
};

/**
 * Document Chat — analyses ALL uploaded documents in the user's organization.
 * Retrieves metadata + extracted text from all docs, builds a combined context,
 * and passes it along with the user's question to the AI service.
 */
export const allDocumentsChat = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ status: 'error', message: 'Message is required' });
    }

    // Fetch all documents in the organization with their metadata
    // We select text from the main document (field extractedText) 
    // and metadata from the relation.
    const documents = await prisma.document.findMany({
      where: {
        organizationId: user.organizationId,
        status: { not: 'DELETED' }
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        category: true,
        extractedText: true,
        metadata: {
          select: {
            department: true,
            tags: true,
            customFields: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Safety cap
    });

    if (documents.length === 0) {
      return res.json({
        status: 'success',
        data: {
          answer: 'There are no documents uploaded in your organization yet. Please upload some documents first.',
          confidence: 1,
          source_found: false
        }
      });
    }

    // Build a combined context from all documents
    const contextBlocks = documents.map((doc, idx) => {
      const meta = doc.metadata;
      const custom: any = meta?.customFields || {};
      const summary = custom?.aiSummary?.summary || custom?.summary || '';
      const keyPhrases = custom?.aiSummary?.keyPoints || custom?.keyPhrases || [];

      return [
        `--- Document ${idx + 1}: "${doc.title}" ---`,
        `File: ${doc.fileName}`,
        `Category: ${doc.category || 'Uncategorized'}`,
        `Department: ${meta?.department || 'General'}`,
        meta?.tags?.length ? `Tags: ${meta.tags.join(', ')}` : '',
        summary ? `Summary: ${summary}` : '',
        keyPhrases.length ? `Key Phrases: ${keyPhrases.join(', ')}` : '',
        doc.extractedText ? `Content Snippet:\n${doc.extractedText.substring(0, 1500)}` : '',
        ''
      ].filter(Boolean).join('\n');
    });

    const combinedContext = contextBlocks.join('\n');

    // Augmented message with all document context
    const augmentedMessage = `You are IntelliBot, an AI assistant for the IntelliDocX document management system.
The user's organization has ${documents.length} uploaded documents. Here is the full context of ALL documents:

${combinedContext}

---
The user's question is:
${message}

Please answer based on the content of ALL the documents above. If the answer spans multiple documents, reference which documents you found the information in. Be precise and helpful.`;

    // Use the system chat endpoint with the augmented message
    const aiResponse = await aiClientService.systemChat(
      user.organizationId,
      augmentedMessage,
      history || []
    );

    res.json({
      status: 'success',
      data: aiResponse
    });

  } catch (error: any) {
    Logger.error(`All Documents Chat Error: ${error.message}`);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to process document chat' });
  }
};
