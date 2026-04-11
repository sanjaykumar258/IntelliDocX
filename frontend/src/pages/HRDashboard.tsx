import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Users, FileText, ClipboardList, Megaphone, Calendar, CheckCircle2,
  Clock, AlertTriangle, Loader2, Plus, X, Send, Zap, Sparkles, TrendingUp,
  User, Eye, PenLine, Briefcase, CalendarDays, FileCheck
} from 'lucide-react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { TicketWidget } from '@/components/widgets/TicketWidget';

/* ─── Animated Counter ─── */
const Counter = ({ from = 0, to }: { from?: number; to: number }) => {
  const count = useMotionValue(from);
  const [display, setDisplay] = useState(from);
  useEffect(() => {
    const c = animate(count, to, { duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94], onUpdate: (v) => setDisplay(Math.round(v)) });
    return c.stop;
  }, [count, to]);
  return <span>{display}</span>;
};

const EMP_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  ON_LEAVE: { label: 'On Leave', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  RESIGNED: { label: 'Resigned', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
  TERMINATED: { label: 'Terminated', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
};

const LEAVE_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
};

export const HRDashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [hrDocs, setHrDocs] = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empSearch, setEmpSearch] = useState('');
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', body: '', visibleTo: 'all' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, empRes, docsRes, onbRes, annRes, leaveRes] = await Promise.all([
        api.get('/hr/stats'),
        api.get('/hr/employees'),
        api.get('/hr/documents'),
        api.get('/hr/onboarding'),
        api.get('/hr/announcements'),
        api.get('/hr/leave'),
      ]);
      setStats(statsRes.data);
      setEmployees(empRes.data);
      setHrDocs(docsRes.data);
      setOnboarding(onbRes.data);
      setAnnouncements(annRes.data);
      setLeaveRequests(leaveRes.data);
    } catch (e) {
      console.error('Failed to fetch HR data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.put(`/hr/leave/${id}/${action}`);
      fetchData();
    } catch (e) { console.error(`Failed to ${action} leave`, e); }
  };

  const handlePublishAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.body.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/hr/announcements', annForm);
      setShowAnnModal(false);
      setAnnForm({ title: '', body: '', visibleTo: 'all' });
      fetchData();
    } catch (e) { console.error('Failed to publish', e); }
    finally { setSubmitting(false); }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.user?.name?.toLowerCase().includes(empSearch.toLowerCase()) ||
    emp.user?.email?.toLowerCase().includes(empSearch.toLowerCase())
  );

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const slideUp = { hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative"><div className="w-16 h-16 rounded-full border-4 border-purple-100 dark:border-purple-900/50" /><div className="w-16 h-16 rounded-full border-4 border-transparent border-t-purple-500 animate-spin absolute inset-0" /><Users className="w-6 h-6 text-purple-500 absolute inset-0 m-auto glow-pulse" /></div>
          <p className="text-sm font-semibold text-slate-500 animate-pulse tracking-wide">Loading HR Dashboard...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { title: 'Total Employees', value: stats?.totalEmployees || 0, sub: `+${stats?.newThisMonth || 0} this month`, icon: Users, color: 'from-purple-500 to-fuchsia-600', shadow: 'shadow-purple-500/25', subColor: stats?.newThisMonth > 0 ? 'text-emerald-500' : 'text-slate-400' },
    { title: 'Pending Documents', value: stats?.pendingDocs || 0, sub: 'Needs signature', icon: FileCheck, color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/25', subColor: stats?.pendingDocs > 0 ? 'text-rose-500' : 'text-slate-400' },
    { title: 'Active Onboarding', value: stats?.activeOnboarding || 0, sub: 'Tasks in progress', icon: ClipboardList, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/25', subColor: 'text-amber-500' },
    { title: 'Pending Leaves', value: stats?.pendingLeaves || 0, sub: 'Awaiting approval', icon: CalendarDays, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/25', subColor: stats?.pendingLeaves > 0 ? 'text-amber-500' : 'text-slate-400' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-8 pb-10 max-w-[1600px] mx-auto">
      {/* ═══ HERO ═══ */}
      <motion.div variants={slideUp} className="relative overflow-hidden bg-gradient-to-br from-white/80 via-purple-50/30 to-fuchsia-50/40 dark:from-slate-900/80 dark:via-purple-950/30 dark:to-fuchsia-950/20 p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-400/20 to-fuchsia-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">HR Operations</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              <span className="animated-gradient-text">Welcome, {user?.name?.split(' ')[0] || 'HR Manager'}</span>{' '}
              <span className="inline-block hover:rotate-12 hover:scale-125 transition-transform cursor-default">👩‍💼</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage employees, HR documents, onboarding, and company announcements.</p>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </div>
        </div>
      </motion.div>

      {/* ═══ KPI CARDS ═══ */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => (
          <motion.div key={idx} variants={slideUp} className="relative glass-card p-6 overflow-hidden group card-hover-lift cursor-default">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color}`}><div className="shimmer-line absolute inset-0" /></div>
            <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700`} />
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.color} flex items-center justify-center shadow-lg ${card.shadow}`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{card.title}</h3>
            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1"><Counter to={card.value} /></div>
            <p className={`text-xs font-semibold ${card.subColor}`}>{card.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ TWO-COLUMN: EMPLOYEE DIRECTORY + LEAVE REQUESTS ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Employee Directory */}
        <motion.div variants={slideUp} className="xl:col-span-3 glass-card-elevated p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center"><Users className="w-4 h-4 text-purple-500" /></div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Employee Directory</h3>
            </div>
          </div>
          <input
            type="text" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30 mb-4"
          />
          <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8 opacity-50"><p className="text-sm font-bold text-slate-400">No employees found</p></div>
            ) : (
              filteredEmployees.map((emp) => {
                const es = EMP_STATUS[emp.status] || EMP_STATUS.ACTIVE;
                return (
                  <div key={emp.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/20">
                      {emp.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{emp.user?.name}</p>
                      <p className="text-[10px] text-slate-400">{emp.user?.email} · {emp.designation || emp.user?.role}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${es.color}`}>{es.label}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{emp.employeeCode}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Leave Requests */}
        <motion.div variants={slideUp} className="xl:col-span-2 glass-card-elevated p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-blue-500" /></div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Leave Requests</h3>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-8 opacity-50"><p className="text-sm font-bold text-slate-400">No leave requests</p></div>
            ) : (
              leaveRequests.slice(0, 10).map((leave) => {
                const ls = LEAVE_STATUS[leave.status] || LEAVE_STATUS.PENDING;
                return (
                  <div key={leave.id} className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{leave.employee?.user?.name}</p>
                        <p className="text-[10px] text-slate-400">{leave.leaveType} · {format(new Date(leave.fromDate), 'MMM d')} - {format(new Date(leave.toDate), 'MMM d')}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${ls.color}`}>{ls.label}</span>
                    </div>
                    {leave.reason && <p className="text-[10px] text-slate-500 mb-2">{leave.reason}</p>}
                    {leave.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleLeaveAction(leave.id, 'approve')} className="px-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">✓ Approve</button>
                        <button onClick={() => handleLeaveAction(leave.id, 'reject')} className="px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors">✕ Reject</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══ THREE-COLUMN: ONBOARDING + ANNOUNCEMENTS + TICKETS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Onboarding Progress */}
        <motion.div variants={slideUp} className="glass-card-elevated p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><ClipboardList className="w-4 h-4 text-amber-500" /></div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Onboarding Tasks</h3>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {onboarding.length === 0 ? (
              <div className="text-center py-6 opacity-50"><p className="text-xs font-bold text-slate-400">No active onboarding</p></div>
            ) : (
              onboarding.slice(0, 8).map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{task.taskName}</p>
                    <p className="text-[9px] text-slate-400">{task.employee?.user?.name} · {task.taskType}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Announcements Board */}
        <motion.div variants={slideUp} className="glass-card-elevated p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center"><Megaphone className="w-4 h-4 text-orange-500" /></div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Announcements</h3>
            </div>
            <button onClick={() => setShowAnnModal(true)} className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors border border-orange-200">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {announcements.length === 0 ? (
              <div className="text-center py-6 opacity-50"><p className="text-xs font-bold text-slate-400">No announcements yet</p></div>
            ) : (
              announcements.slice(0, 6).map((ann) => (
                <div key={ann.id} className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{ann.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-slate-400">{formatDistanceToNow(new Date(ann.publishedAt), { addSuffix: true })}</span>
                    <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{ann.visibleTo}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* IT Support Widget */}
        <motion.div variants={slideUp}>
          <TicketWidget />
        </motion.div>
      </div>

      {/* ═══ ANNOUNCEMENT MODAL ═══ */}
      <AnimatePresence>
        {showAnnModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowAnnModal(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center"><Megaphone className="w-5 h-5 text-white" /></div>
                    <div><h2 className="text-lg font-black text-slate-900 dark:text-white">New Announcement</h2><p className="text-xs text-slate-400">Publish to all employees</p></div>
                  </div>
                  <button onClick={() => setShowAnnModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Title *</label>
                  <input type="text" value={annForm.title} onChange={(e) => setAnnForm({...annForm, title: e.target.value})} placeholder="Announcement title"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Message *</label>
                  <textarea value={annForm.body} onChange={(e) => setAnnForm({...annForm, body: e.target.value})} rows={4} placeholder="Write your announcement..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Visibility</label>
                  <div className="flex gap-2">
                    {['all', 'employees_only', 'managers_only'].map((v) => (
                      <button key={v} onClick={() => setAnnForm({...annForm, visibleTo: v})}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${annForm.visibleTo === v ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30 text-orange-700 dark:text-orange-400' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                      >
                        {v === 'all' ? 'Everyone' : v === 'employees_only' ? 'Employees' : 'Managers'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button onClick={() => setShowAnnModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={handlePublishAnnouncement} disabled={submitting || !annForm.title.trim() || !annForm.body.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  Publish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
