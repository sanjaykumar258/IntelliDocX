export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'HR_MANAGER' | 'IT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE' | 'GUEST';
  organizationId: string;
}

export interface Document {
  id: string;
  title: string;
  fileName: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  currentVersion: number;
  metadata?: {
    department?: string;
    category?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  };
  // Classification
  category?: string;
  confidence?: number;
  extractedText?: string;
  
  // Extended Metadata
  fileSize?: number;
  mimeType?: string;
  blockchainHash?: string;
  uploadedBy?: {
    id: string;
    name: string;
  };

  // Expiry & Retention
  expiryDate?: string;
  retentionDays?: number;
  autoArchive?: boolean;
}

export interface WorkflowInstance {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  currentStep: number;
  documentId: string;
  document: Document;
}

export interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'WORKFLOW' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
