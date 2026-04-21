import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Download, Trash2, Eye, ShieldCheck, ShieldAlert, MessageSquare, FileText, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Document } from '@/types';
import { Progress } from '@/components/ui/progress';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onVerify: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onPreview: (id: string) => void;
  onChat: (id: string, title: string) => void;
  selectedDocs?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (all: boolean) => void;
}

export const DocumentList = ({ documents, loading, onVerify, onDelete, onDownload, onPreview, onChat, selectedDocs, onToggleSelect, onSelectAll }: DocumentListProps) => {
  if (loading) return null; // Handled by standard layout skeleton if needed

  const getFileIconColor = (type: string | undefined) => {
    if (!type) return 'text-slate-400';
    if (type.includes('pdf')) return 'text-rose-500';
    if (type.includes('word') || type.includes('docx')) return 'text-blue-500';
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return 'text-emerald-500';
    return 'text-slate-400';
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const slideUp = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50">
            <tr>
              <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase w-10">
                {onSelectAll && (
                  <button 
                    type="button"
                    onClick={() => onSelectAll(!(selectedDocs?.size === documents.length && documents.length > 0))}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      selectedDocs?.size === documents.length && documents.length > 0
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400'
                    }`}
                  >
                    <Check strokeWidth={4} className="w-3 h-3" />
                  </button>
                )}
              </th>
              <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Document Name</th>
              <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Classification</th>
              <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Telemetry</th>
              <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">State</th>
              <th className="px-6 py-4 font-semibold text-xs tracking-wider uppercase text-right">Actions</th>
            </tr>
          </thead>
          <motion.tbody 
            className="divide-y divide-slate-100 dark:divide-slate-800/50"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {documents.map((doc) => (
                <motion.tr 
                  key={doc.id}
                  variants={slideUp}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className={`group transition-colors relative ${selectedDocs?.has(doc.id) ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}
                >
                  <td className="px-6 py-4">
                    {onToggleSelect && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(doc.id); }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          selectedDocs?.has(doc.id)
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent opacity-0 group-hover:opacity-100 hover:border-indigo-400'
                        } ${selectedDocs?.has(doc.id) ? 'opacity-100' : ''}`}
                      >
                        <Check strokeWidth={4} className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className={`w-5 h-5 shrink-0 ${getFileIconColor(doc.mimeType)}`} />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform duration-200 flex items-center gap-2">
                          {doc.title}
                          <ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-500" />
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {((doc.fileSize || 0) / 1024 / 1024).toFixed(2)} MB • Ver {doc.currentVersion}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                      {doc.metadata?.category || doc.category || 'UNCLASSIFIED'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-semibold text-slate-500">
                        Added {format(new Date(doc.createdAt), 'MMM d')} by {doc.uploadedBy?.name || 'System'}
                      </div>
                      {doc.confidence !== undefined && doc.confidence > 0 && (
                        <div className="flex items-center gap-2 w-24">
                          <Progress value={doc.confidence * 100} className="h-1 bg-slate-200 dark:bg-slate-800" />
                          <span className="text-[10px] font-bold text-emerald-500">{Math.round(doc.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`relative flex h-2 w-2`}>
                        {doc.processingStatus === 'COMPLETED' ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </>
                        ) : doc.processingStatus === 'PROCESSING' || doc.processingStatus === 'PENDING' ? (
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500 animate-pulse"></span>
                        ) : (
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        )}
                      </span>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                        {doc.processingStatus}
                      </span>
                      {doc.blockchainHash && (
                        <span title="Secured on Blockchain">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 ml-2" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" onClick={() => onPreview(doc.id)} title="Preview"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400" onClick={() => onChat(doc.id, doc.title)} title="AI Chat"><MessageSquare className="w-4 h-4" /></Button>
                      {!doc.blockchainHash && <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400" onClick={() => onVerify(doc.id, doc.title)} title="Verify Integrity"><ShieldAlert className="w-4 h-4" /></Button>}
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => onDownload(doc.id)} title="Download"><Download className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => onDelete(doc.id)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </motion.tbody>
        </table>
      </div>
    </div>
  );
};
