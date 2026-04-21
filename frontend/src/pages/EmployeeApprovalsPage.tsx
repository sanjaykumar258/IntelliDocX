import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { socketService } from '@/api/socketService';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText, FileSpreadsheet, FileImage, File,
  ChevronDown, CheckCircle2, XCircle,
  Clock, Download, Eye, Upload, RefreshCw,
  Headphones, Inbox
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type DocStatus = 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

interface ApprovalStep {
  stage: string;
  role?: string;
  reviewer_name: string;
  reviewer_email: string;
  status: 'approved' | 'rejected' | 'pending' | 'waiting';
  action_comment: string;
  timestamp: string | null;
}

interface MyDocument {
  id: string;
  name: string;
  fileName: string;
  category: string;
  version: number;
  status: DocStatus;
  uploaded_at: string;
  current_stage: number;
  mimeType?: string;
  approval_log: ApprovalStep[];
  rejection_comment: { reason?: string; fix_items?: string[] } | null;
  workflow_id: string | null;
}

interface Stats {
  total: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
}

type FilterTab = 'ALL' | DocStatus;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusConfig: Record<DocStatus, { label: string; pill: string; section: string; dot: string; banner: string }> = {
  PENDING_REVIEW: {
    label: 'Pending review',
    pill: 'bg-amber-100 text-amber-700 border border-amber-200',
    section: 'PENDING REVIEW',
    dot: 'bg-amber-400',
    banner: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  UNDER_REVIEW: {
    label: 'Under review',
    pill: 'bg-blue-100 text-blue-700 border border-blue-200',
    section: 'UNDER REVIEW',
    dot: 'bg-blue-500',
    banner: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  APPROVED: {
    label: 'Approved',
    pill: 'bg-green-100 text-green-700 border border-green-200',
    section: 'APPROVED DOCUMENTS',
    dot: 'bg-green-500',
    banner: 'bg-[#EAF3DE] border-green-200 text-[#27500A]',
  },
  REJECTED: {
    label: 'Rejected',
    pill: 'bg-red-100 text-[#791F1F] border border-red-200',
    section: 'NEEDS YOUR ATTENTION — REJECTED',
    dot: 'bg-red-500',
    banner: 'bg-[#FCEBEB] border-red-200 text-[#791F1F]',
  },
};

function getFileIcon(mimeType = '', status: DocStatus) {
  const color = status === 'APPROVED' ? 'text-green-500'
    : status === 'REJECTED' ? 'text-red-500'
    : status === 'UNDER_REVIEW' ? 'text-blue-500'
    : 'text-amber-500';

  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return <FileSpreadsheet className={`w-6 h-6 ${color}`} />;
  if (mimeType.includes('image'))
    return <FileImage className={`w-6 h-6 ${color}`} />;
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text'))
    return <FileText className={`w-6 h-6 ${color}`} />;
  return <File className={`w-6 h-6 ${color}`} />;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, accent, icon }: {
  label: string; value: number; accent: string; icon: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-800 shadow-sm min-w-[130px] flex-1`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{value}</div>
      </div>
    </motion.div>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────
const TIMELINE_STAGES = ['EMPLOYEE', 'TEAM_LEAD', 'MANAGER', 'ADMIN'];
const STAGE_LABELS: Record<string, string> = {
  EMPLOYEE: 'You (Employee)',
  TEAM_LEAD: 'Team Lead',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
};

function ApprovalTimeline({ doc }: { doc: MyDocument }) {
  const steps = TIMELINE_STAGES.map((stage, i) => {
    if (stage === 'EMPLOYEE') {
      return {
        stage,
        label: 'You (Employee)',
        email: '',
        status: 'approved' as const,
        comment: 'Uploaded document',
        timestamp: doc.uploaded_at,
      };
    }
    const logEntry = doc.approval_log.find(l =>
      l.stage?.toUpperCase().includes(stage) ||
      (l.role?.toUpperCase?.() || '').includes(stage)
    );
    if (logEntry) {
      return {
        stage,
        label: STAGE_LABELS[stage],
        email: logEntry.reviewer_email,
        status: logEntry.status,
        comment: logEntry.action_comment,
        timestamp: logEntry.timestamp,
      };
    }
    const docStatusOrder: Record<DocStatus, number> = { PENDING_REVIEW: 1, UNDER_REVIEW: 2, APPROVED: 4, REJECTED: 2 };
    const currentOrder = docStatusOrder[doc.status];
    const stageOrder = i;
    let status: 'approved' | 'pending' | 'waiting' | 'rejected' = 'waiting';
    if (doc.status === 'APPROVED' && stageOrder < 4) status = 'approved';
    else if (doc.status === 'REJECTED' && stageOrder === doc.current_stage) status = 'rejected';
    else if (stageOrder < currentOrder) status = 'approved';
    else if (stageOrder === currentOrder && doc.status !== 'REJECTED') status = 'pending';

    return { stage, label: STAGE_LABELS[stage], email: '', status, comment: '', timestamp: null };
  });

  return (
    <div className="mt-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Approval Timeline</div>
      <div className="relative pl-4">
        {steps.map((step, i) => {
          const dotColor =
            step.status === 'approved' ? 'bg-green-500'
            : step.status === 'rejected' ? 'bg-red-500'
            : step.status === 'pending' ? 'bg-[#534AB7]'
            : 'bg-slate-200';
          const lineColor = step.status === 'approved' ? 'bg-green-200' : 'bg-slate-100';

          return (
            <div key={step.stage} className="relative flex gap-3 pb-5 last:pb-0">
              {i < steps.length - 1 && (
                <div className={`absolute left-[5.5px] top-4 w-[1px] h-full ${lineColor}`} />
              )}
              <div className={`mt-1 w-3 h-3 rounded-full shrink-0 z-10 ${dotColor} ring-2 ring-white`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold ${step.status === 'pending' ? 'text-[#534AB7] dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {step.label}
                </div>
                {step.comment && (
                  <div className="text-xs text-slate-500 mt-0.5">{step.comment}</div>
                )}
                {step.timestamp && (
                  <div className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(step.timestamp)}</div>
                )}
                {step.status === 'waiting' && (
                  <div className="text-xs text-slate-300 mt-0.5 italic">Not yet reached</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────
function DocumentCard({ doc, onWithdraw }: {
  doc: MyDocument;
  onWithdraw: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(doc.status === 'REJECTED');
  const { toast } = useToast();
  const navigate = useNavigate();
  const cfg = statusConfig[doc.status];
  const rej = doc.rejection_comment;

  const handleWithdraw = async () => {
    if (!confirm('Withdraw this document? It will be deleted.')) return;
    onWithdraw(doc.id);
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: doc.mimeType || 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || doc.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'destructive', title: 'Download failed', description: 'Could not download the file.' });
    }
  };

  const handleView = async () => {
    try {
      const res = await api.get(`/documents/${doc.id}/download?inline=true`, { responseType: 'blob' });
      const mime = doc.mimeType || res.headers['content-type'] || 'application/octet-stream';
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      window.open(url, '_blank');
      // Revoke after 60s
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast({ variant: 'destructive', title: 'Preview failed', description: 'Could not open the document.' });
    }
  };

  const handleReupload = () => {
    toast({ title: 'Re-upload', description: 'Navigate to Documents → Upload new version.' });
    navigate('/documents');
  };

  const handleGetHelp = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast({ variant: 'destructive', title: 'Not logged in', description: 'Please log in again.' });
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `Document Support: ${doc.name}`,
          description: `I need help with my document "${doc.name}" (Category: ${doc.category}).\n\nCurrent status: ${doc.status.replace(/_/g, ' ')}\nDocument ID: ${doc.id}`,
          category: 'Other',
          priority: 'MEDIUM',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      toast({
        title: 'IT Ticket Raised ✅',
        description: `Ticket #${data.ticketNumber} submitted. IT will respond shortly.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Ticket creation failed',
        description: err.message || 'Could not create support ticket.',
      });
    }
  };

  const bannerText: Record<DocStatus, string> = {
    PENDING_REVIEW: 'Waiting for Team Lead review. Estimated: 24 hrs.',
    UNDER_REVIEW: 'Team Lead approved. Awaiting Manager review.',
    APPROVED: 'Fully approved and published.',
    REJECTED: 'This document was rejected. Please review the details below and re-upload a corrected version.',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
    >
      {/* Header Row */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
          {getFileIcon(doc.mimeType, doc.status)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 dark:text-white text-sm truncate">{doc.name}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Uploaded {fmtDate(doc.uploaded_at)} · Category: {doc.category} · v{doc.version}.0
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.pill}`}>
            {cfg.label}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-200 dark:border-slate-800">

              {/* Status Banner */}
              <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${cfg.banner}`}>
                {doc.status === 'PENDING_REVIEW' && <><Clock className="inline w-4 h-4 mr-1.5 -mt-0.5" />{bannerText.PENDING_REVIEW}</>}
                {doc.status === 'UNDER_REVIEW' && <><Clock className="inline w-4 h-4 mr-1.5 -mt-0.5" />{bannerText.UNDER_REVIEW}</>}
                {doc.status === 'APPROVED' && <><CheckCircle2 className="inline w-4 h-4 mr-1.5 -mt-0.5" />{bannerText.APPROVED}</>}
                {doc.status === 'REJECTED' && <><XCircle className="inline w-4 h-4 mr-1.5 -mt-0.5" />{bannerText.REJECTED}</>}
              </div>

              {/* Rejection Details */}
              {doc.status === 'REJECTED' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-[#FCEBEB] border border-red-200 px-4 py-3 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#791F1F]">Rejection Reason</div>
                    <p className="text-sm text-[#791F1F] leading-relaxed">
                      {rej?.reason || doc.approval_log.filter(l => l.status === 'rejected').pop()?.action_comment || 'No reason provided.'}
                    </p>
                    {(() => {
                      const rejLog = doc.approval_log.filter(l => l.status === 'rejected').pop();
                      if (!rejLog) return null;
                      return (
                        <p className="text-[11px] text-red-400 italic">
                          — Rejected by {rejLog.reviewer_name} ({rejLog.reviewer_email || 'approver'}) on {fmtDateTime(rejLog.timestamp)}
                        </p>
                      );
                    })()}
                  </div>

                  {rej?.fix_items && rej.fix_items.length > 0 && (
                    <div className="rounded-xl bg-[#FFFBF0] border border-amber-200 px-4 py-3 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#633806]">What You Need to Fix</div>
                      <ol className="space-y-2">
                        {rej.fix_items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-[#633806]">{item}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Approval Timeline */}
              <ApprovalTimeline doc={doc} />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {doc.status === 'PENDING_REVIEW' && (
                  <>
                    <button onClick={handleView} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <Eye className="w-4 h-4" /> View document
                    </button>
                    <button onClick={handleWithdraw} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                      <XCircle className="w-4 h-4" /> Withdraw & re-upload
                    </button>
                  </>
                )}
                {doc.status === 'UNDER_REVIEW' && (
                  <button onClick={handleView} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Eye className="w-4 h-4" /> View document
                  </button>
                )}
                {doc.status === 'APPROVED' && (
                  <>
                    <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm">
                      <Download className="w-4 h-4" /> Download approved copy
                    </button>
                    <button onClick={handleView} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e0e0ef] text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      <Eye className="w-4 h-4" /> View document
                    </button>
                    <button onClick={handleReupload} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#534AB7]/30 text-sm font-medium text-[#534AB7] hover:bg-[#534AB7]/5 transition-colors">
                      <Upload className="w-4 h-4" /> Upload new version
                    </button>
                  </>
                )}
                {doc.status === 'REJECTED' && (
                  <>
                    <button onClick={handleReupload} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#534AB7] text-sm font-semibold text-white hover:bg-[#453db5] transition-colors shadow-sm shadow-[#534AB7]/25">
                      <RefreshCw className="w-4 h-4" /> Re-upload fixed version
                    </button>
                    <button onClick={handleView} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <Eye className="w-4 h-4" /> View original document
                    </button>
                    <button onClick={handleGetHelp} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <Headphones className="w-4 h-4" /> Ask IT for help
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Section Group ────────────────────────────────────────────────────────────
function SectionGroup({ status, docs, onWithdraw }: {
  status: DocStatus;
  docs: MyDocument[];
  onWithdraw: (id: string) => void;
}) {
  if (docs.length === 0) return null;
  const cfg = statusConfig[status];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{cfg.section}</span>
      </div>
      {docs.map(doc => (
        <DocumentCard key={doc.id} doc={doc} onWithdraw={onWithdraw} />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center mb-5">
        <Inbox className="w-9 h-9 text-[#534AB7]/40 dark:text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No documents yet</h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
        Upload your first document from the <strong>Documents</strong> page to start the approval process.
      </p>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All documents' },
  { key: 'PENDING_REVIEW', label: 'Pending' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_ORDER: DocStatus[] = ['REJECTED', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED'];

export const EmployeeApprovalsPage = () => {
  const [docs, setDocs] = useState<MyDocument[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, under_review: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        api.get('/documents/my'),
        api.get('/documents/my/stats'),
      ]);
      setDocs(docsRes.data?.data || docsRes.data || []);
      setStats(statsRes.data || { total: 0, pending: 0, under_review: 0, approved: 0, rejected: 0 });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load',
        description: err.response?.data?.message || 'Could not fetch your documents.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchAll(); 
    
    // Enable Live Simultaneous Updates
    if (socketService.socket) {
      socketService.socket.on('document:uploaded', fetchAll);
      socketService.socket.on('workflow:updated', fetchAll);
      socketService.socket.on('workflow:escalated', fetchAll);
      socketService.socket.on('workflow:rejected', fetchAll);
      socketService.socket.on('workflow:approved', fetchAll);
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('document:uploaded', fetchAll);
        socketService.socket.off('workflow:updated', fetchAll);
        socketService.socket.off('workflow:escalated', fetchAll);
        socketService.socket.off('workflow:rejected', fetchAll);
        socketService.socket.off('workflow:approved', fetchAll);
      }
    };
  }, [fetchAll]);

  const handleWithdraw = useCallback(async (id: string) => {
    try {
      await api.post(`/documents/${id}/withdraw`);
      toast({ title: 'Document withdrawn', description: 'It has been removed from the review queue.' });
      fetchAll();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Withdraw failed',
        description: err.response?.data?.message || 'Unable to withdraw document.'
      });
    }
  }, [fetchAll]);

  const filtered = activeTab === 'ALL'
    ? docs
    : docs.filter(d => d.status === activeTab);

  const tabCount = (key: FilterTab): number => {
    if (key === 'ALL') return docs.length;
    if (key === 'PENDING_REVIEW') return stats.pending;
    if (key === 'UNDER_REVIEW') return stats.under_review;
    if (key === 'APPROVED') return stats.approved;
    if (key === 'REJECTED') return stats.rejected;
    return 0;
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Approvals</h1>
          <p className="text-slate-400 text-sm mt-1">Track the real-time progress of your document validation sequences.</p>
        </div>

        {/* KPI Cards */}
        <div className="flex flex-wrap gap-3">
          <KpiCard label="Total uploaded" value={stats.total} accent="bg-slate-100" icon={<FileText className="w-5 h-5 text-slate-500" />} />
          <KpiCard label="Pending review" value={stats.pending} accent="bg-amber-50" icon={<Clock className="w-5 h-5 text-amber-500" />} />
          <KpiCard label="Under review" value={stats.under_review} accent="bg-blue-50" icon={<RefreshCw className="w-5 h-5 text-blue-500" />} />
          <KpiCard label="Approved" value={stats.approved} accent="bg-green-50" icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} />
          <KpiCard label="Rejected" value={stats.rejected} accent="bg-red-50" icon={<XCircle className="w-5 h-5 text-red-500" />} />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map(tab => {
            const count = tabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#534AB7] text-white shadow-md shadow-[#534AB7]/20'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-[#534AB7]/30 hover:text-[#534AB7]'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : activeTab === 'ALL' ? (
          <div className="space-y-4">
            {STATUS_ORDER.map(status => (
              <SectionGroup
                key={status}
                status={status}
                docs={filtered.filter(d => d.status === status)}
                onWithdraw={handleWithdraw}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => (
              <DocumentCard key={doc.id} doc={doc} onWithdraw={handleWithdraw} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
