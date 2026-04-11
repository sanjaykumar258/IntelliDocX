import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Plus, X, Send, Clock, CheckCircle2, 
  Loader2, Plane, Umbrella, HeartPulse, Coffee
} from 'lucide-react';
import { format } from 'date-fns';

const LEAVE_TYPES = [
  { value: 'Annual Leave', icon: Umbrella, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { value: 'Sick Leave', icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { value: 'Personal Leave', icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'Business Trip', icon: Plane, color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10', icon: Clock },
  APPROVED: { label: 'Approved', color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10', icon: X },
};

export const LeaveWidget = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'Annual Leave',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/hr/leave');
      setLeaves(res.data);
    } catch (e) {
      console.error('Failed to fetch leaves', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/hr/leave', form);
      setShowModal(false);
      setForm({ leaveType: 'Annual Leave', fromDate: '', toDate: '', reason: '' });
      fetchLeaves();
    } catch (e) {
      console.error('Failed to submit leave', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600">
          <div className="shimmer-line absolute inset-0" />
        </div>
        
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Leave Tracker</h3>
              <p className="text-[10px] font-semibold text-slate-400">Request & manage time off</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Request Leave
        </button>

        <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-6"><p className="text-xs font-semibold text-slate-400">No leave requests found.</p></div>
          ) : (
            leaves.slice(0, 5).map((leave) => {
              const status = STATUS_CONFIG[leave.status] || STATUS_CONFIG.PENDING;
              const typeInfo = LEAVE_TYPES.find(t => t.value === leave.leaveType) || LEAVE_TYPES[0];
              const Icon = typeInfo.icon;
              return (
                <div key={leave.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 transition-all">
                  <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{leave.leaveType}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{format(new Date(leave.fromDate), 'MMM d')} - {format(new Date(leave.toDate), 'MMM d')}</p>
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border border-transparent ${status.color}`}>
                    {status.label}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center"><Umbrella className="w-5 h-5 text-white" /></div>
                  <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Apply for Leave</h2><p className="text-xs text-slate-400">Submit your request for HR approval</p></div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Leave Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAVE_TYPES.map((type) => (
                      <button key={type.value} onClick={() => setForm({ ...form, leaveType: type.value })} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${form.leaveType === type.value ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-600'}`}>
                        <type.icon className="w-4 h-4" />{type.value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">From Date</label>
                    <input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">To Date</label>
                    <input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Reason</label>
                  <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Briefly explain the reason for your leave..." rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !form.fromDate || !form.toDate || !form.reason.trim()} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Submit Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
