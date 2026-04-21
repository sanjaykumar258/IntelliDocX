import { motion, AnimatePresence } from 'framer-motion';
import { Document } from '@/types';
import { DocumentCard } from './DocumentCard';
import { Inbox } from 'lucide-react';

interface DocumentGridProps {
  documents: Document[];
  loading: boolean;
  onVerify: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onPreview: (id: string) => void;
  onChat: (id: string, title: string) => void;
  selectedDocs?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export const DocumentGrid = ({ documents, loading, onVerify, onDelete, onDownload, onPreview, onChat, selectedDocs, onToggleSelect }: DocumentGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={`skeleton-${i}`} className="h-64 bg-slate-100/50 dark:bg-slate-800/20 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
          </div>
        ))}
      </div>
    );
  }

  if (!Array.isArray(documents) || documents.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] text-center"
      >
        <div className="w-24 h-24 mb-6 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
          <Inbox className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No documents yet</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">Upload your first document to get started. Our AI will automatically classify and index the contents.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <AnimatePresence mode="popLayout">
        {documents.map((doc, index) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            index={index}
            onDownload={onDownload}
            onPreview={onPreview}
            onVerify={onVerify}
            onChat={onChat}
            onDelete={onDelete}
            isSelected={selectedDocs?.has(doc.id)}
            onToggleSelect={() => onToggleSelect?.(doc.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
