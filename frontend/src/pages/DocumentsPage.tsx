import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api/client';
import { Document } from '@/types';
import { 
  Search, Grid, List as ListIcon, ChevronRight, FileText, Briefcase, Users, 
  BarChart3, Scale, FolderKanban, DollarSign, UserCheck, Brain, Sparkles, 
  Filter, TrendingUp, Clock, Trash2, Check
} from 'lucide-react';
import { UploadModal } from '@/components/documents/UploadModal';
import { DocumentGrid } from '@/components/documents/DocumentGrid';
import { DocumentList } from '@/components/documents/DocumentList';
import { useToast } from '@/components/ui/use-toast';
import { DocumentChat } from '@/components/documents/DocumentChat';
import { BlockchainSecurityModal } from '@/components/documents/BlockchainSecurityModal';
import { DeleteConfirmationModal } from '@/components/documents/DeleteConfirmationModal';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { motion, AnimatePresence } from 'framer-motion';
import { socketService } from '@/api/socketService';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// ═══ FILTER CATEGORY CONFIGURATION ═══
const FILTER_CATEGORIES = [
  { id: 'All',        label: 'All Documents', icon: FileText,      color: 'from-slate-500 to-slate-700',     activeColor: 'bg-gradient-to-r from-slate-700 to-slate-900 dark:from-white dark:to-slate-200', textActive: 'text-white dark:text-slate-900' },
  { id: 'INVOICES',   label: 'Invoices',      icon: DollarSign,    color: 'from-emerald-500 to-teal-600',    activeColor: 'bg-gradient-to-r from-emerald-500 to-teal-600', textActive: 'text-white' },
  { id: 'CONTRACTS',  label: 'Contracts',     icon: Briefcase,     color: 'from-blue-500 to-indigo-600',     activeColor: 'bg-gradient-to-r from-blue-500 to-indigo-600', textActive: 'text-white' },
  { id: 'RESUMES',    label: 'Resumes',       icon: UserCheck,     color: 'from-violet-500 to-purple-600',   activeColor: 'bg-gradient-to-r from-violet-500 to-purple-600', textActive: 'text-white' },
  { id: 'REPORTS',    label: 'Reports',       icon: BarChart3,     color: 'from-amber-500 to-orange-600',    activeColor: 'bg-gradient-to-r from-amber-500 to-orange-600', textActive: 'text-white' },
  { id: 'LEGAL',      label: 'Legal',         icon: Scale,         color: 'from-rose-500 to-pink-600',       activeColor: 'bg-gradient-to-r from-rose-500 to-pink-600', textActive: 'text-white' },
  { id: 'PROJECTS',   label: 'Projects',      icon: FolderKanban,  color: 'from-cyan-500 to-sky-600',        activeColor: 'bg-gradient-to-r from-cyan-500 to-sky-600', textActive: 'text-white' },
  { id: 'FINANCIAL',  label: 'Financial',     icon: TrendingUp,    color: 'from-lime-500 to-green-600',      activeColor: 'bg-gradient-to-r from-lime-500 to-green-600', textActive: 'text-white' },
  { id: 'HR',         label: 'HR',            icon: Users,         color: 'from-fuchsia-500 to-pink-600',    activeColor: 'bg-gradient-to-r from-fuchsia-500 to-pink-600', textActive: 'text-white' },
  { id: 'AI_INSIGHTS',label: 'AI Insights',   icon: Brain,         color: 'from-indigo-500 to-violet-600',   activeColor: 'bg-gradient-to-r from-indigo-500 to-violet-600', textActive: 'text-white' },
];

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVerifyDoc, setActiveVerifyDoc] = useState<{ id: string, title: string } | null>(null);
  const [activeChatDoc, setActiveChatDoc] = useState<{ id: string, title: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ id: string, title: string, mimeType: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, id: string, title: string }>({ isOpen: false, id: '', title: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  // Keep a ref to activeFilter so fetchDocuments can always use the latest value
  // without being re-created every time activeFilter changes (which would reset socket listeners)
  const activeFilterRef = useRef(activeFilter);
  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const cat = activeFilterRef.current;
      const url = cat && cat !== 'All'
        ? `/documents?category=${encodeURIComponent(cat)}`
        : '/documents';
      const response = await api.get(url);
      const docs = response.data.data || response.data;
      setDocuments(docs);
      setTotalCount(response.data.total || docs.length);
    } catch (error) {
      console.error('Failed to fetch documents', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch workspace topology." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ═══ REAL-TIME SOCKET EVENTS ═══
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    // When the AI worker finishes classifying a document, re-fetch so it shows in the correct category tab
    const onCategorized = () => {
      fetchDocuments();
    };

    // When a document is hard-deleted by another session, remove it from local state immediately
    const onDeleted = ({ documentId }: { documentId: string }) => {
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      setTotalCount(prev => Math.max(0, prev - 1));
    };

    socket.on('document:categorized', onCategorized);
    socket.on('document:deleted', onDeleted);

    return () => {
      socket.off('document:categorized', onCategorized);
      socket.off('document:deleted', onDeleted);
    };
  }, [fetchDocuments]);

  // Real-time Semantic Debounce Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery && activeFilter === 'All') {
        fetchDocuments();
        return;
      }
      setLoading(true);
      try {
        let url = `/documents/search?q=${encodeURIComponent(searchQuery)}`;
        if (activeFilter !== 'All') {
          url += `&category=${encodeURIComponent(activeFilter)}`;
        }
        // Fallback to strict listing if query is utterly empty
        if (!searchQuery) {
          url = `/documents?category=${encodeURIComponent(activeFilter)}`;
        }
        
        const response = await api.get(url);
        const docs = response.data.data || response.data;
        setDocuments(docs);
        setTotalCount(response.data.total || docs.length);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, fetchDocuments]);

  const handleVerify = (id: string, title: string) => setActiveVerifyDoc({ id, title });
  const handleChat = (id: string, title: string) => setActiveChatDoc({ id, title });

  const handleDelete = (id: string, title: string) => {
    setDeleteDialog({ isOpen: true, id, title });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    const deletedId = deleteDialog.id;
    setIsDeleting(true);
    // Optimistically remove from UI immediately for snappy UX
    setDocuments(prev => prev.filter(d => d.id !== deletedId));
    setTotalCount(prev => Math.max(0, prev - 1));
    setDeleteDialog({ isOpen: false, id: '', title: '' });
    try {
      const response = await api.delete(`/documents/${deletedId}`);
      if (response.status === 202) {
        // Approval needed - undo the optimistic removal
        setDocuments(prev => prev); // Will be restored by next fetch
        toast({ title: "Deletion Requested", description: "Your delete request has been forwarded for admin approval.", className: "bg-indigo-950 text-white border-0" });
        fetchDocuments(); // Restore the list since it wasn't actually deleted
      } else {
        toast({ title: "Asset Purged", description: "Document deleted from secure storage.", className: "bg-slate-900 text-white border-0" });
      }
    } catch (error: any) {
      // Restore the document to the list on failure
      fetchDocuments();
      if (error.response?.status === 409) {
        toast({ title: "Approval Pending", description: "This document is already waiting for an Admin to approve its deletion.", className: "bg-amber-500 text-white border-0" });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Delete sequence aborted." });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedDocs);
    // Optimistic UI updates
    setDocuments(prev => prev.filter(d => !ids.includes(d.id)));
    setTotalCount(prev => Math.max(0, prev - ids.length));
    setSelectedDocs(new Set());
    
    try {
      const response = await api.delete(`/documents/bulk?ids=${ids.join(',')}`);
      if (response.status === 202) {
        toast({ title: "Deletion Requested", description: "Your bulk delete request has been forwarded for admin approval.", className: "bg-indigo-950 text-white border-0" });
        fetchDocuments();
      } else {
        toast({ title: "Assets Purged", description: `${ids.length} documents deleted.`, className: "bg-slate-900 text-white border-0" });
      }
    } catch (error) {
      fetchDocuments();
      toast({ variant: "destructive", title: "Error", description: "Bulk delete failed." });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("WARNING: Are you sure you want to permanently delete ALL documents in the vault? This cannot be undone.")) return;
    setIsDeletingAll(true);
    try {
      await api.delete('/documents/all');
      toast({ title: "Vault Purged", description: "All documents have been deleted.", className: "bg-rose-600 text-white border-0" });
      setDocuments([]);
      setTotalCount(0);
      setSelectedDocs(new Set());
    } catch (error) {
      fetchDocuments();
      toast({ variant: "destructive", title: "Error", description: "Purge failed. You may lack permissions." });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handlePreview = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setPreviewDoc({ id, title: doc.title, mimeType: doc.mimeType || 'application/octet-stream' });
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'classified-asset';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch.length >= 2) fileName = fileNameMatch[1];
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  // Count documents per category (client-side for badge counts)
  const getCategoryCount = (filterId: string): number => {
    if (filterId === 'All') return documents.length;
    // Map parent categories to known sub-categories
    const categoryMap: Record<string, string[]> = {
      'INVOICES':   ['INVOICE', 'RECEIPT', 'PURCHASE_ORDER', 'QUOTATION', 'BILL'],
      'CONTRACTS':  ['CONTRACT', 'AGREEMENT', 'NDA', 'LICENSE', 'PERMIT', 'MOU'],
      'RESUMES':    ['RESUME', 'CV', 'COVER_LETTER', 'PORTFOLIO'],
      'REPORTS':    ['REPORT', 'AUDIT_REPORT', 'SALES_REPORT', 'PROJECT_REPORT', 'MARKET_ANALYSIS', 'RESEARCH'],
      'LEGAL':      ['LEGAL_NOTICE', 'COMPLIANCE', 'REGULATION', 'POLICY', 'TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
      'PROJECTS':   ['PROJECT_PLAN', 'PROPOSAL', 'PRESENTATION', 'MEETING_NOTES', 'TECHNICAL_DOC', 'SRS', 'SPECIFICATION'],
      'FINANCIAL':  ['FINANCIAL_STATEMENT', 'TAX_DOCUMENT', 'BANK_STATEMENT', 'EXPENSE_REPORT', 'INVESTMENT_RECORD', 'BUDGET', 'PAYROLL'],
      'HR':         ['OFFER_LETTER', 'EMPLOYEE_RECORD', 'PAYSLIP', 'PERFORMANCE_REVIEW', 'ID_PROOF', 'LEAVE_APPLICATION', 'APPRAISAL'],
      'COMMUNICATION': ['EMAIL', 'MEMO', 'LETTER', 'NOTICE', 'CIRCULAR', 'ANNOUNCEMENT'],
      'AI_INSIGHTS': ['AI_GENERATED', 'RECOMMENDATION', 'IMAGE_ANALYSIS', 'DATA_REPORT', 'ANALYTICS', 'AI_INSIGHT'],
    };
    if (activeFilter === 'All') {
      // Count from full document set based on category membership
      const subs = categoryMap[filterId] || [];
      return documents.filter(d => {
        const cat = (d.category || d.metadata?.category || '').toUpperCase();
        return subs.includes(cat);
      }).length;
    }
    return 0; // When filtered, counts aren't meaningful
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };
  
  const slideUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const activeFilterConfig = FILTER_CATEGORIES.find(f => f.id === activeFilter) || FILTER_CATEGORIES[0];

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="max-w-[1600px] mx-auto pb-12"
    >
      {/* ═══ HERO HEADER ═══ */}
      <motion.div variants={slideUp} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
            Workspace <ChevronRight className="w-4 h-4" /> 
            <span className="text-indigo-600 dark:text-indigo-400">Intelligent Vault</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight relative inline-block">
            Document Hub
            <span className="absolute -bottom-2 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 rounded-full" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-4 max-w-xl leading-relaxed">
            AI-powered document classification, search, and intelligent metadata extraction across your enterprise vault.
          </p>
        </div>
        
        <div className="shrink-0 flex gap-3 items-center">
          {/* Document stats badge */}
          <div className="hidden md:flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 px-4 py-2.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalCount} docs</span>
            </div>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Live</span>
            </div>
          </div>
          <UploadModal onUploadSuccess={fetchDocuments} />
        </div>
      </motion.div>

      {/* ═══ SEARCH & FILTER CONTROL CENTER ═══ */}
      <motion.div variants={slideUp} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm mb-8 space-y-5">
        
        {/* Search Bar Row */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-2xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, content, metadata, or AI classification..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-16 h-14 bg-white/80 dark:bg-slate-950/80 border lg:border-2 border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 dark:text-white transition-all shadow-sm hover:shadow-md text-[15px] font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* View Mode Toggle + Filter indicator */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {activeFilter !== 'All' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1.5 rounded-xl"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">{activeFilterConfig.label}</span>
                <button onClick={() => setActiveFilter('All')} className="text-indigo-400 hover:text-indigo-600 text-xs font-bold">✕</button>
              </motion.div>
            )}
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-950/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/50">
              <button 
                onClick={() => setViewMode('grid')}
                className={`w-10 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`w-10 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ CATEGORY FILTER CHIPS (Scrollable) ═══ */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_CATEGORIES.map((chip) => {
            const IconComp = chip.icon;
            const count = activeFilter === 'All' ? getCategoryCount(chip.id) : 0;
            const isActive = activeFilter === chip.id;
            return (
              <motion.button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap relative overflow-hidden ${
                  isActive 
                    ? `${chip.activeColor} ${chip.textActive} shadow-lg shadow-slate-500/10 scale-[1.02]`
                    : 'bg-white/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{chip.label}</span>
                {chip.id !== 'All' && count > 0 && activeFilter === 'All' && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    isActive 
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <motion.div 
                    layoutId="activeFilterIndicator"
                    className="absolute inset-0 rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ RESULTS SUMMARY BAR ═══ */}
      {!loading && documents.length > 0 && (
        <motion.div variants={slideUp} className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </span>
            </div>
            {searchQuery && (
              <span className="text-xs text-slate-400 font-medium">
                matching "{searchQuery}"
              </span>
            )}
            {selectedDocs.size > 0 && (
               <span className="text-sm font-bold text-indigo-600 ml-4">
                 {selectedDocs.size} selected
               </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedDocs.size > 0 && (
              <button 
                onClick={handleBulkDelete} 
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 text-xs font-bold rounded-lg transition-colors border border-rose-200 dark:border-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            )}
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && documents.length > 0 && (
              <button 
                onClick={handleDeleteAll} 
                disabled={isDeletingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-lg transition-colors shadow-sm shadow-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingAll ? 'Purging Vault...' : 'Delete All'}
              </button>
            )}
            {documents.length > 0 && (
               <button
                 onClick={() => {
                   if (selectedDocs.size === documents.length) {
                     setSelectedDocs(new Set());
                   } else {
                     setSelectedDocs(new Set(documents.map(d => d.id)));
                   }
                 }}
                 className="flex items-center gap-1.5 ml-2 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-500/10 dark:text-slate-400 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
               >
                 <Check className="w-3.5 h-3.5" />
                 {selectedDocs.size === documents.length ? 'Deselect All' : 'Select All'}
               </button>
            )}
            <span className="text-xs font-medium text-slate-400 ml-2">
              Sorted by latest
            </span>
          </div>
        </motion.div>
      )}

      {/* ═══ PRIMARY RENDERING SURFACE ═══ */}
      <motion.div variants={slideUp} className="relative min-h-[50vh]">
        <AnimatePresence mode="wait">
          {documents.length === 0 && !loading ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Search className="w-12 h-12 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No documents found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                {searchQuery 
                  ? `No assets match "${searchQuery}". Try different keywords or adjust your filters.`
                  : activeFilter !== 'All'
                    ? `No ${activeFilterConfig.label} documents yet. Upload one to get started.`
                    : `Your vault is empty. Upload your first document and our AI will classify it automatically.`
                }
              </p>
              {(searchQuery || activeFilter !== 'All') && (
                <button 
                  onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Clear All Filters
                </button>
              )}
            </motion.div>
          ) : viewMode === 'grid' ? (
            <motion.div key="grid-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
              <DocumentGrid 
                documents={documents} loading={loading} onVerify={handleVerify} onDelete={(id) => {
                  const doc = documents.find(d => d.id === id);
                  handleDelete(id, doc?.title || 'Unknown');
                }} onDownload={handleDownload} onPreview={handlePreview} onChat={handleChat}
                selectedDocs={selectedDocs} onToggleSelect={toggleSelect}
              />
            </motion.div>
          ) : (
            <motion.div key="list-view" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
              <DocumentList 
                documents={documents} loading={loading} onVerify={handleVerify} onDelete={(id) => {
                  const doc = documents.find(d => d.id === id);
                  handleDelete(id, doc?.title || 'Unknown');
                }} onDownload={handleDownload} onPreview={handlePreview} onChat={handleChat}
                selectedDocs={selectedDocs} onToggleSelect={toggleSelect}
                onSelectAll={(all) => {
                  if (all) {
                    setSelectedDocs(new Set(documents.map(d => d.id)));
                  } else {
                    setSelectedDocs(new Set());
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══ AI CHAT DRAWER ═══ */}
      <AnimatePresence>
        {activeChatDoc && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveChatDoc(null)}
              className="fixed inset-0 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity" 
            />
            <div className="fixed inset-y-0 right-0 z-50 flex">
              <DocumentChat
                documentId={activeChatDoc.id}
                documentTitle={activeChatDoc.title}
                onClose={() => setActiveChatDoc(null)}
              />
            </div>
          </>
        )}
      </AnimatePresence>

      <BlockchainSecurityModal
        documentId={activeVerifyDoc?.id || ''}
        documentTitle={activeVerifyDoc?.title || ''}
        isOpen={!!activeVerifyDoc}
        onClose={() => setActiveVerifyDoc(null)}
      />
      <DeleteConfirmationModal
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
        onConfirm={confirmDelete}
        title={deleteDialog.title}
        isDeleting={isDeleting}
      />
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        documentId={previewDoc?.id || ''}
        documentTitle={previewDoc?.title || ''}
        mimeType={previewDoc?.mimeType || ''}
        onDownload={handleDownload}
      />
    </motion.div>
  );
};
