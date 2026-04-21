import axios from 'axios';
import prisma from '../utils/prisma';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || 'intellidocx-ai-secret-key';

export class AIClientService {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: AI_SERVICE_URL,
      headers: {
        'X-API-Key': AI_SERVICE_API_KEY,
        'AI_SERVICE_API_KEY': AI_SERVICE_API_KEY,
        'Content-Type': 'application/json',
      },
    });
  }

  async processDocument(documentId: string, organizationId: string, filePath: string, title?: string, fileName?: string) {
    try {
      const response = await this.client.post('/ai/process-document', {
        documentId,
        organizationId,
        filePath,
        title,
        fileName,
      });

      return response.data;
    } catch (error) {
      console.warn('AI Processing Warning: AI Service unreachable or failed. Using fallback data.');
      // Return fallback data instead of throwing to prevent worker crash
      return {
        department: 'General',
        category: 'Uncategorized',
        tags: ['auto-processed'],
        confidence: 0,
        summary: 'AI Service unavailable'
      };
    }
  }

  async search(query: string, organizationId: string, filters?: any) {
    try {
      const response = await this.client.post('/ai/search', {
        query,
        organizationId,
        limit: 100,
        filters,
      });

      return response.data.results;
    } catch (error) {
      console.error('AI Search Error:', error);
      throw new Error('Failed to search documents via AI service');
    }
  }

  async chat(documentId: string, organizationId: string, message: string, history: any[] = []) {
    try {
      const response = await this.client.post('/ai/chat', {
        documentId,
        organizationId,
        message,
        history,
      });

      return response.data;
    } catch (error: any) {
      console.error('AI Chat Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || error.message || 'Failed to communicate with AI chat service');
    }
  }

  async summarize(documentId: string, organizationId: string, title?: string) {
    try {
      const response = await this.client.post('/ai/summarize', {
        documentId, organizationId, title
      });
      return response.data;
    } catch (error) {
      console.error('AI Summarize Error:', error);
      return { summary: 'Summary unavailable', keyPoints: [], wordCount: 0 };
    }
  }

  async checkCompliance(documentId: string, organizationId: string, category: string = 'General') {
    try {
      const response = await this.client.post('/ai/compliance', {
        documentId, organizationId, category
      });
      return response.data;
    } catch (error) {
      console.error('AI Compliance Error:', error);
      return { riskLevel: 'UNKNOWN', riskScore: 0, findings: [], checkedRules: 0, category };
    }
  }

  async detectAi(documentId: string, organizationId: string) {
    try {
      const response = await this.client.post('/ai/detect-ai', {
        documentId, organizationId
      });
      return response.data;
    } catch (error) {
      console.error('AI Detect Error:', error);
      return { isAiGenerated: false, confidence: 0, indicators: [], scores: {} };
    }
  }

  async getRelationships(documentId: string, organizationId: string, limit: number = 5) {
    try {
      const response = await this.client.post('/ai/relationships', {
        documentId, organizationId, limit
      });
      return response.data;
    } catch (error) {
      console.error('AI Relationships Error:', error);
      return { relatedDocuments: [], totalFound: 0 };
    }
  }

  async systemChat(organizationId: string, message: string, history: any[] = []) {
    try {
      const response = await this.client.post('/ai/system-chat', {
        organizationId,
        message,
        history
      });
      return response.data;
    } catch (error: any) {
      console.error('AI System Chat Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || error.message || 'Failed to communicate with AI system chat service');
    }
  }
}

export const aiClientService = new AIClientService();
