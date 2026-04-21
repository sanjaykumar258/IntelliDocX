import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface WorkflowInstanceData {
  id: string;
  document: { title: string; type: string };
  currentStepIndex: number;
  steps: { role: string; status: 'COMPLETED' | 'PENDING' | 'FUTURE' }[];
  currentRole: string;
  slaRemainingHours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface ApprovalTrackerProps {
  instance: WorkflowInstanceData;
  onApprove: (id: string, comment: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onEscalate: (id: string) => Promise<void>;
}

const slideIn = {
  hidden: { x: -20, opacity: 0 },
  show: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export const ApprovalTracker = ({ instance, onApprove, onReject, onEscalate }: ApprovalTrackerProps) => {
  const [actionState, setActionState] = useState<'IDLE' | 'APPROVING' | 'REJECTING'>('IDLE');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  const getSlaColor = (hours: number) => {
    if (hours < 1) return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20';
    if (hours < 4) return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
    return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
  };

  const getSlaText = (hours: number) => {
    if (hours < 1) return `${Math.floor(hours * 60)}m left - Critical`;
    return `${hours}h remaining`;
  };

  const handleSubmit = async (action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !comment.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsSubmitting(true);
    try {
      if (action === 'APPROVE') {
        await onApprove(instance.id, comment);
      } else {
        await onReject(instance.id, comment);
      }
      setActionState('IDLE');
      setComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ROLE_HIERARCHY: Record<string, number> = {
    SUPER_ADMIN: 100, ADMIN: 90, MANAGER: 80, HR_MANAGER: 75, IT_MANAGER: 75, TEAM_LEAD: 60, EMPLOYEE: 40, GUEST: 10
  };
  const userLvl = ROLE_HIERARCHY[user?.role || ''] || 0;
  const requiredLvl = ROLE_HIERARCHY[instance.currentRole] || 999;
  const canApprove = userLvl >= requiredLvl;

  return (
    <motion.div 
      layout
      variants={slideIn}
      className={`relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border p-5 rounded-3xl shadow-sm overflow-hidden flex flex-col xl:flex-row items-start xl:items-center gap-6 transition-all ring-1 ring-inset ${actionState === 'APPROVING' ? 'border-emerald-500/50 ring-emerald-500/20 shadow-emerald-500/10' : actionState === 'REJECTING' ? 'border-rose-500/50 ring-rose-500/20 shadow-rose-500/10' : 'border-slate-200/60 dark:border-slate-800/60 ring-transparent'}`}
    >
      {/* Left side: Document Info */}
      <div className="flex items-center gap-4 min-w-[280px]">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white truncate text-base hover:text-indigo-600 transition-colors cursor-pointer" title={instance.document.title}>{instance.document.title}</h4>
          <span className="text-xs font-semibold text-slate-500 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mt-1 inline-block uppercase tracking-wider">
            {instance.document.type}
          </span>
        </div>
      </div>

      {/* Middle side: Progress Track */}
      <div className="flex-1 w-full flex items-center justify-center overflow-x-auto px-4 py-2 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center min-w-max">
          {instance.steps.map((step, idx) => (
            <div key={idx} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 w-16 group/step cursor-default">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-all ${
                  step.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-500 text-emerald-500 dark:bg-emerald-500/10' :
                  step.status === 'PENDING' ? 'bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-500/10 ring-4 ring-indigo-500/20 animate-pulse' :
                  'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                }`}>
                  {step.status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4" /> :
                   step.status === 'PENDING' ? <RefreshCw className="w-4 h-4" /> :
                   <Clock className="w-4 h-4" />}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-tight truncate px-1 w-full ${
                  step.status === 'PENDING' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {step.role}
                </span>
              </div>
              {idx < instance.steps.length - 1 && (
                <div className={`w-8 h-[2px] mx-1 mb-4 rounded-full transition-colors ${
                  step.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right side: Actions / SLA */}
      <div className="flex items-center justify-between xl:justify-end gap-6 w-full xl:w-auto xl:min-w-[320px]">
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${getSlaColor(instance.slaRemainingHours)}`}>
          {instance.slaRemainingHours < 1 ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {getSlaText(instance.slaRemainingHours)}
          {instance.slaRemainingHours < 1 && instance.status === 'PENDING' && (
            <button 
              onClick={() => onEscalate(instance.id)}
              className="ml-2 px-2 py-0.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors uppercase text-[9px]"
            >
              Escalate Now
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {user?.role === 'EMPLOYEE' || !canApprove ? (
            <div className="text-xs font-bold text-slate-400 italic px-4">
              Awaiting {instance.currentRole.replace('_', ' ')}
            </div>
          ) : actionState === 'IDLE' ? (
            <motion.div key="actions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setActionState('REJECTING')} className="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-xl font-bold h-9 px-4">
                Reject
              </Button>
              <Button size="sm" onClick={() => setActionState('APPROVING')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-9 px-4 font-bold">
                Approve
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="confirm" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1, x: shake ? [-5, 5, -5, 5, 0] : 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <input 
                type="text" 
                placeholder={actionState === 'REJECTING' ? "Reason required..." : "Optional comment..."} 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={`h-9 px-3 rounded-lg text-sm border focus:outline-none focus:ring-2 w-48 bg-white dark:bg-slate-950/50 ${
                  actionState === 'REJECTING' 
                  ? 'border-rose-200 focus:ring-rose-500/50 dark:border-rose-500/30' 
                  : 'border-emerald-200 focus:ring-emerald-500/50 dark:border-emerald-500/30'
                }`}
                autoFocus
              />
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => { setActionState('IDLE'); setComment(''); }} 
                className="w-9 p-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                disabled={isSubmitting}
              >
                <XCircle className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleSubmit(actionState === 'APPROVING' ? 'APPROVE' : 'REJECT')} 
                disabled={isSubmitting}
                className={`rounded-lg h-9 w-9 p-0 shadow-md ${
                  actionState === 'REJECTING' 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
