import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, Activity, Box, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { WorkflowCard, WorkflowTemplate } from '@/components/workflows/WorkflowCard';
import { ApprovalTracker, WorkflowInstanceData } from '@/components/workflows/ApprovalTracker';
import { CreateTemplateModal } from '@/components/workflows/CreateTemplateModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { socketService } from '@/api/socketService';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export const WorkflowsPage = () => {
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowInstanceData[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);

  // ────────────────────────────────────────────────────────────
  // IMPORTANT: All hooks MUST be called before any early return.
  // The Navigate redirect for EMPLOYEE is placed after all hooks.
  // ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingRes, templatesRes] = await Promise.all([
        api.get('/workflows/active'),
        api.get('/workflows/templates')
      ]);

      const rawData = pendingRes.data.success ? pendingRes.data.data : pendingRes.data;

      // Map backend response to UI-friendly format
      const mapped: WorkflowInstanceData[] = rawData.map((wf: any) => {
        const dueDate = wf.dueDate ? new Date(wf.dueDate) : null;
        const now = new Date();
        const slaRemainingHours = dueDate
          ? Math.max(0, Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)))
          : (wf.template?.slaHours || 24);

        return {
          id: wf.id,
          document: {
            title: wf.document?.title || wf.document?.fileName || 'Untitled Asset',
            type: wf.document?.category || 'General',
            ownerId: wf.document?.ownerId,
          },
          currentStepIndex: wf.currentStepIndex || 0,
          slaRemainingHours,
          currentRole: wf.template?.steps?.find((s: any) => s.order === wf.currentStepIndex)?.requiredRole || 'MANAGER',
          status: wf.status,
          steps: wf.template?.steps?.map((s: any) => ({
            role: s.requiredRole,
            status:
              wf.currentStepIndex > s.order
                ? 'COMPLETED'
                : wf.currentStepIndex === s.order
                ? 'PENDING'
                : 'FUTURE',
          })) || [],
        };
      });

      setActiveWorkflows(mapped);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch workflows', error);
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Could not synchronize with orchestration engine.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();

    // Listen for real-time workflow updates via Socket.IO
    const socket = socketService.socket;
    if (socket) {
      socket.on('workflow:updated', fetchData);
      socket.on('workflow:escalated', fetchData);
    }

    return () => {
      if (socket) {
        socket.off('workflow:updated', fetchData);
        socket.off('workflow:escalated', fetchData);
      }
    };
  }, [fetchData]);

  // ── Early return for EMPLOYEE role — placed AFTER all hooks ─
  // React requires hooks to be called in the same order on every render,
  // so conditional returns must come after all hook calls.
  if (user?.role === 'EMPLOYEE') {
    return <Navigate to="/my-approvals" replace />;
  }

  const handleApprove = async (id: string, comment: string) => {
    try {
      await api.post(`/workflows/action/${id}`, { action: 'APPROVE', comment });
      toast({
        title: 'Workflow Approved',
        description: 'The document has advanced to the next sequence.',
        className: 'bg-emerald-500 text-white border-0',
      });
      fetchData();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: e.response?.data?.message || 'Unauthorized action.',
      });
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await api.post(`/workflows/action/${id}`, { action: 'REJECT', comment: reason });
      toast({
        title: 'Workflow Rejected',
        description: 'The sequence has been terminated.',
        className: 'bg-rose-500 text-white border-0',
      });
      fetchData();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Rejection Failed',
        description: e.response?.data?.message || 'Unauthorized action.',
      });
    }
  };

  const handleEscalate = async (id: string) => {
    try {
      await api.post(`/workflows/action/${id}`, { action: 'ESCALATE' });
      toast({
        title: 'Workflow Escalated',
        description: 'Institutional oversight has been requested.',
        className: 'bg-rose-600 text-white border-0',
      });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Escalation Failed',
        description: error.response?.data?.message || 'Could not reach administration.',
      });
    }
  };

  const handleCreateTemplate = async (templateData: any) => {
    try {
      await api.post('/workflows/templates', templateData);
      toast({ title: 'Template Deployed', description: `${templateData.name} is now live.` });
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Deployment Failed',
        description: e.response?.data?.message || 'Internal registry error.',
      });
    }
  };

  const hasBreach = activeWorkflows.some(w => w.slaRemainingHours < 1 && w.status === 'PENDING');

  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainer} className="max-w-[1600px] mx-auto pb-20 px-4 xl:px-8">

      {/* SLA Breach Banner */}
      <AnimatePresence>
        {hasBreach && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.5 } }}
            exit={{ y: -50, opacity: 0 }}
            className="mb-8 bg-rose-500/10 border-2 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-rose-500/50">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-rose-600 dark:text-rose-400 font-extrabold text-lg flex items-center gap-2">
                  SLA Breach Detected{' '}
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] uppercase rounded-full tracking-widest animate-pulse">
                    Critical
                  </span>
                </h3>
                <p className="text-rose-500/80 dark:text-rose-400/80 text-sm font-semibold">
                  Multiple instances are overdue. Immediate intervention required.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <motion.div variants={slideUp} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="relative">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight relative inline-block mb-3">
            Workflows
            <span className="absolute -bottom-2 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg md:text-xl max-w-2xl">
            Orchestrate document approvals with intelligent automated routing.
          </p>
        </div>

        {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative h-12 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/25 overflow-hidden active:scale-95 transition-all"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-2">
              Create Template <Zap className="w-4 h-4" />
            </span>
          </button>
        ) : null}
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={slideUp} className="flex items-center gap-4 mb-14 overflow-x-auto pb-2 no-scrollbar">
        <StatChip
          icon={<Activity className="w-4 h-4 text-indigo-500" />}
          label="Total Active"
          value={activeWorkflows.length}
          bg="bg-indigo-50 dark:bg-indigo-500/10"
          border="border-indigo-200 dark:border-indigo-500/30"
        />
        <StatChip
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          label="Pending"
          value={activeWorkflows.filter(w => w.status === 'PENDING').length}
          bg="bg-amber-50 dark:bg-amber-500/10"
          border="border-amber-200 dark:border-amber-500/30"
        />
        <StatChip
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          label="SLA Breached"
          value={activeWorkflows.filter(w => w.slaRemainingHours < 1).length}
          bg="bg-rose-50 dark:bg-rose-500/10"
          border="border-rose-200 dark:border-rose-500/30"
          pulse={hasBreach}
        />
      </motion.div>

      {/* Templates Grid */}
      <motion.div variants={slideUp} className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Approval Templates</h2>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-3 py-1 rounded-full text-sm border border-slate-200 dark:border-slate-700">
            {templates.length}
          </span>
        </div>

        {templates.length === 0 ? (
          <EmptyState
            title="No templates engineered yet."
            subtitle="Create your first approval template to orchestrate routing."
            action={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t) => (
              <WorkflowCard
                key={t.id}
                template={t}
                onStart={() =>
                  toast({
                    title: 'Manual Start Restricted',
                    description: 'Workflows are auto-triggered upon document upload.',
                  })
                }
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Active Approvals List */}
      <motion.div variants={slideUp} className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Active Approvals</h2>
          <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1 rounded-full text-sm border border-indigo-200 dark:border-indigo-500/30 animate-pulse">
            {activeWorkflows.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-32 bg-slate-100/50 dark:bg-slate-800/30 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : activeWorkflows.length === 0 ? (
          <EmptyState
            title="Queue clear."
            subtitle="No assets currently require your attention."
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {activeWorkflows.map(instance => (
                <ApprovalTracker
                  key={instance.id}
                  instance={instance}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEscalate={handleEscalate}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <CreateTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateTemplate}
      />
    </motion.div>
  );
};

// ── Sub-components ──────────────────────────────────────────

const StatChip = ({ icon, label, value, bg, border, pulse }: any) => (
  <div
    className={`flex items-center gap-4 px-5 py-3 rounded-2xl border ${bg} ${border} shrink-0 ${
      pulse ? 'ring-2 ring-rose-500/50 animate-pulse' : ''
    } shadow-sm backdrop-blur-sm`}
  >
    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
      {icon}
    </div>
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-0.5">
        {label}
      </div>
      <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{value}</div>
    </div>
  </div>
);

const EmptyState = ({ title, subtitle, action }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm p-8 text-center group"
  >
    <motion.div
      animate={{ y: [-5, 5, -5] }}
      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      className="w-24 h-24 mb-6 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700"
    >
      <Box className="w-10 h-10 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors duration-500" />
    </motion.div>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mb-6">{subtitle}</p>
    {action && (
      <button
        onClick={action}
        className="bg-slate-900 hover:bg-indigo-600 dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-500 dark:hover:text-white text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
      >
        Take Action
      </button>
    )}
  </motion.div>
);
