import { memo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Download, Trash2, Eye, ShieldCheck, Sparkles, MessageSquare, ShieldAlert, FileText, Image, FileSpreadsheet, File, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Document } from '@/types';
import { Progress } from '@/components/ui/progress';

// ═══ CATEGORY COLOR SYSTEM ═══
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  // Invoices & Billing
  'INVOICE':        { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', glow: 'from-emerald-500 to-teal-500' },
  'RECEIPT':        { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', glow: 'from-emerald-500 to-teal-500' },
  'PURCHASE_ORDER': { bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-500/20', glow: 'from-teal-500 to-cyan-500' },
  
  // Contracts
  'CONTRACT':   { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', glow: 'from-blue-500 to-indigo-500' },
  'AGREEMENT':  { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', glow: 'from-blue-500 to-indigo-500' },
  'NDA':        { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/20', glow: 'from-indigo-500 to-violet-500' },
  'LICENSE':    { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-500/20', glow: 'from-sky-500 to-blue-500' },

  // Resumes
  'RESUME':       { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', glow: 'from-violet-500 to-purple-500' },
  'CV':           { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', glow: 'from-violet-500 to-purple-500' },
  'COVER_LETTER': { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20', glow: 'from-purple-500 to-fuchsia-500' },

  // Reports
  'REPORT':              { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', glow: 'from-amber-500 to-orange-500' },
  'FINANCIAL_STATEMENT': { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20', glow: 'from-orange-500 to-red-500' },
  'AUDIT_REPORT':        { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', glow: 'from-amber-500 to-yellow-500' },
  'SALES_REPORT':        { bg: 'bg-yellow-50 dark:bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-500/20', glow: 'from-yellow-500 to-amber-500' },
  'PROJECT_REPORT':      { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', glow: 'from-amber-500 to-orange-500' },
  
  // Legal
  'LEGAL_NOTICE': { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20', glow: 'from-rose-500 to-pink-500' },
  'COMPLIANCE':   { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-500/20', glow: 'from-pink-500 to-rose-500' },
  'POLICY':       { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20', glow: 'from-rose-500 to-red-500' },

  // Projects
  'PROJECT_PLAN':   { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20', glow: 'from-cyan-500 to-sky-500' },
  'PROPOSAL':       { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-500/20', glow: 'from-sky-500 to-blue-500' },
  'TECHNICAL_DOC':  { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20', glow: 'from-cyan-500 to-teal-500' },
  'MEETING_NOTES':  { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-500/20', glow: 'from-sky-500 to-cyan-500' },
  'PRESENTATION':   { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-500/20', glow: 'from-sky-500 to-blue-500' },

  // Financial
  'TAX_DOCUMENT':      { bg: 'bg-lime-50 dark:bg-lime-500/10', text: 'text-lime-700 dark:text-lime-400', border: 'border-lime-200 dark:border-lime-500/20', glow: 'from-lime-500 to-green-500' },
  'BANK_STATEMENT':    { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-500/20', glow: 'from-green-500 to-emerald-500' },
  'EXPENSE_REPORT':    { bg: 'bg-lime-50 dark:bg-lime-500/10', text: 'text-lime-700 dark:text-lime-400', border: 'border-lime-200 dark:border-lime-500/20', glow: 'from-lime-500 to-green-500' },

  // HR
  'OFFER_LETTER':       { bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', text: 'text-fuchsia-700 dark:text-fuchsia-400', border: 'border-fuchsia-200 dark:border-fuchsia-500/20', glow: 'from-fuchsia-500 to-pink-500' },
  'PAYSLIP':            { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-500/20', glow: 'from-pink-500 to-fuchsia-500' },
  'PERFORMANCE_REVIEW': { bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', text: 'text-fuchsia-700 dark:text-fuchsia-400', border: 'border-fuchsia-200 dark:border-fuchsia-500/20', glow: 'from-fuchsia-500 to-violet-500' },
  'LEAVE_APPLICATION':  { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-500/20', glow: 'from-pink-500 to-rose-500' },

  // Communication
  'LETTER':   { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', glow: 'from-slate-400 to-slate-600' },
  'MEMO':     { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', glow: 'from-slate-400 to-slate-600' },
  'NOTICE':   { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', glow: 'from-slate-400 to-slate-600' },

  // AI Insights
  'AI_INSIGHT': { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/20', glow: 'from-indigo-500 to-violet-500' },

  // Default
  'OTHER':        { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', glow: 'from-slate-400 to-slate-500' },
  'UNCLASSIFIED': { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', glow: 'from-slate-400 to-slate-500' },
};

// Human-readable labels
const CATEGORY_LABELS: Record<string, string> = {
  'INVOICE': 'Invoice', 'RECEIPT': 'Receipt', 'PURCHASE_ORDER': 'Purchase Order',
  'CONTRACT': 'Contract', 'AGREEMENT': 'Agreement', 'NDA': 'NDA', 'LICENSE': 'License',
  'RESUME': 'Resume', 'CV': 'CV', 'COVER_LETTER': 'Cover Letter',
  'REPORT': 'Report', 'FINANCIAL_STATEMENT': 'Financial Statement', 'AUDIT_REPORT': 'Audit Report', 
  'SALES_REPORT': 'Sales Report', 'PROJECT_REPORT': 'Project Report', 'MARKET_ANALYSIS': 'Market Analysis',
  'LEGAL_NOTICE': 'Legal Notice', 'COMPLIANCE': 'Compliance', 'POLICY': 'Policy',
  'PROJECT_PLAN': 'Project Plan', 'PROPOSAL': 'Proposal', 'TECHNICAL_DOC': 'Technical Doc', 
  'MEETING_NOTES': 'Meeting Notes', 'PRESENTATION': 'Presentation',
  'TAX_DOCUMENT': 'Tax Document', 'BANK_STATEMENT': 'Bank Statement', 'EXPENSE_REPORT': 'Expense Report',
  'OFFER_LETTER': 'Offer Letter', 'PAYSLIP': 'Payslip', 'PERFORMANCE_REVIEW': 'Performance Review', 
  'LEAVE_APPLICATION': 'Leave Application',
  'LETTER': 'Letter', 'MEMO': 'Memo', 'NOTICE': 'Notice',
  'AI_INSIGHT': 'AI Insight',
  'OTHER': 'Other', 'UNCLASSIFIED': 'Unclassified',
};

// File icon configuration
const getFileIcon = (mimeType: string | undefined) => {
  if (!mimeType) return { icon: File, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  if (mimeType.includes('pdf')) return { icon: FileText, color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' };
  if (mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('doc')) return { icon: FileText, color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' };
  if (mimeType.includes('image') || mimeType.includes('png') || mimeType.includes('jpg') || mimeType.includes('jpeg')) return { icon: Image, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return { icon: FileSpreadsheet, color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' };
  return { icon: File, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
};

interface DocumentCardProps {
  document: Document;
  index: number;
  onDownload: (id: string) => void;
  onPreview: (id: string) => void;
  onVerify: (id: string, title: string) => void;
  onChat: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export const DocumentCard = memo(({ document, index, onDownload, onPreview, onVerify, onChat, onDelete }: DocumentCardProps) => {
  const extension = document.title.split('.').pop()?.toUpperCase() || 'FILE';
  const category = (document.category || document.metadata?.category || 'OTHER').toUpperCase();
  const categoryStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES['OTHER'];
  const categoryLabel = CATEGORY_LABELS[category] || category.replace(/_/g, ' ');
  const isVerified = document.blockchainHash && document.blockchainHash.length > 0;
  const fileIcon = getFileIcon(document.mimeType);
  const IconComp = fileIcon.icon;
  
  // Extract useful metadata fields (skip AI verbose data)
  const metadataFields = document.metadata?.customFields 
    ? Object.entries(document.metadata.customFields)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
        .filter(([k]) => !k.startsWith('ai') && !k.startsWith('classified') && k !== 'parentCategory' && k !== 'subCategory')
        .slice(0, 4)
    : [];

  // Get parent category for badge
  const parentCategory = document.metadata?.customFields?.parentCategory as string || '';
  
  // File size display
  const fileSizeMB = ((document.fileSize || 0) / 1024 / 1024).toFixed(2);
  const fileSizeDisplay = parseFloat(fileSizeMB) < 0.01 ? '<0.01 MB' : `${fileSizeMB} MB`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className="group relative"
    >
      {/* Hover glow */}
      <div className={`absolute -inset-0.5 bg-gradient-to-b ${categoryStyle.glow} opacity-0 group-hover:opacity-[0.08] rounded-[26px] blur-sm transition-opacity duration-500`} />
      
      <div className="h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col justify-between overflow-hidden relative">
        
        {/* Top color accent line */}
        <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${categoryStyle.glow}`}>
          <div className="shimmer-line absolute inset-0 opacity-40" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div className="flex items-center gap-3 w-full pr-8">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${fileIcon.color}`}>
              <IconComp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm leading-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default" title={document.title}>
                {document.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{fileSizeDisplay}</span>
                <span className="text-slate-300 dark:text-slate-700 text-[8px]">•</span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">v{document.currentVersion}</span>
                <span className="text-slate-300 dark:text-slate-700 text-[8px]">•</span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">{extension}</span>
              </div>
            </div>
          </div>
          
          {/* Verify badge */}
          <button 
            onClick={() => onVerify(document.id, document.title)}
            className="absolute right-0 top-0 p-1.5 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110"
            title={isVerified ? "Verified on Blockchain" : "Verify Integrity"}
          >
            {isVerified ? (
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            ) : (
              <ShieldAlert className="w-4.5 h-4.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* ── Category & Status Badges ── */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 relative z-10">
          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
            {categoryLabel}
          </div>
          
          {parentCategory && parentCategory !== category && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700/50">
              <Tag className="w-2.5 h-2.5" />
              {parentCategory.replace(/_/g, ' ')}
            </div>
          )}

          {document.processingStatus === 'PROCESSING' && (
            <div className="px-2 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 animate-pulse flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              Processing
            </div>
          )}
          {document.processingStatus === 'COMPLETED' && (
            <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Completed
            </div>
          )}
          {document.processingStatus === 'FAILED' && (
            <div className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
              Failed
            </div>
          )}
        </div>
        
        {/* ── AI Confidence Bar ── */}
        {document.confidence !== undefined && document.confidence > 0 && (
          <div className="mb-3 space-y-1.5 relative z-10">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                AI Confidence
              </span>
              <span className={`font-black ${
                document.confidence >= 0.8 ? 'text-emerald-500' :
                document.confidence >= 0.5 ? 'text-amber-500' : 'text-rose-500'
              }`}>{Math.round(document.confidence * 100)}%</span>
            </div>
            <Progress 
              value={document.confidence * 100} 
              className="h-1.5 bg-slate-100 dark:bg-slate-800"
              indicatorClassName={
                document.confidence >= 0.8 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                document.confidence >= 0.5 ? 'bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                'bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
              }
            />
          </div>
        )}

        {/* ── Extracted Metadata Grid ── */}
        {metadataFields.length > 0 && (
          <div className="mb-3 bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-2.5 space-y-1 relative z-10">
            {metadataFields.map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-[10px] w-full gap-2">
                <span className="font-semibold text-slate-400 dark:text-slate-500 capitalize truncate shrink-0 max-w-[40%]">
                  {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate text-right" title={String(v)}>
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              {document.uploadedBy?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <Clock className="w-3 h-3" />
              {format(new Date(document.createdAt), 'MMM d, yyyy')}
            </div>
          </div>
          
          {/* Tags preview */}
          {document.metadata?.tags && document.metadata.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {document.metadata.tags.slice(0, 2).map((tag: string, i: number) => (
                <span key={i} className="text-[9px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Hover Action Overlay ── */}
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-white via-white/98 to-transparent dark:from-slate-950 dark:via-slate-950/98 flex items-end justify-center p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20">
          <div className="flex items-center gap-2 w-full justify-center">
            <Button size="icon" variant="secondary" className="rounded-xl h-9 w-9 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 shadow-sm" onClick={() => onPreview(document.id)} title="Preview">
              <Eye className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" className="rounded-xl h-9 w-9 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-400 shadow-sm" onClick={() => onChat(document.id, document.title)} title="AI Chat">
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" className="rounded-xl h-9 w-9 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 shadow-sm" onClick={() => onDownload(document.id)} title="Download">
              <Download className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" className="rounded-xl h-9 w-9 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 shadow-sm" onClick={() => onDelete(document.id)} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

DocumentCard.displayName = "DocumentCard";
