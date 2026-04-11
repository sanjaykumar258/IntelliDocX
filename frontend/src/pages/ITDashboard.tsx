import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Headphones, AlertTriangle, Clock, CheckCircle2, Loader2, MessageSquare,
  Send, X, Zap, Sparkles, Shield, ArrowRight, User, Bug, ChevronDown,
  Activity, TrendingUp, Timer
} from 'lucide-react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { AnnouncementsWidget } from '@/components/widgets/AnnouncementsWidget';
import { LeaveWidget } from '@/components/widgets/LeaveWidget';

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

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  LOW: { label: 'Low', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', dot: 'bg-emerald-500' },
  MEDIUM: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', dot: 'bg-amber-500' },
  HIGH: { label: 'High', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400', dot: 'bg-rose-500' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 animate-pulse', dot: 'bg-red-500' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Open', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400', icon: AlertTriangle },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', icon: Loader2 },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400', icon: CheckCircle2 },
};

const FILTER_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export const ITDashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        api.get('/tickets/stats'),
        api.get('/tickets'),
      ]);
      setStats(statsRes.data);
      setTickets(ticketsRes.data);
    } catch (e) {
      console.error('Failed to fetch IT data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openTicketDetail = async (ticket: any) => {
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      setSelectedTicket(res.data);
      setThreadMessages(res.data.messages || []);
    } catch (e) {
      console.error('Failed to load ticket', e);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${selectedTicket.id}/messages`, { message: replyText, isInternal });
      setThreadMessages(prev => [...prev, res.data]);
      setReplyText('');
    } catch (e) { console.error('Send failed', e); }
    finally { setSending(false); }
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await api.put(`/tickets/${selectedTicket.id}/status`, { status });
      setSelectedTicket({ ...selectedTicket, status });
      fetchData();
    } catch (e) { console.error('Status update failed', e); }
  };

  const assignToMe = async () => {
    if (!selectedTicket) return;
    try {
      await api.put(`/tickets/${selectedTicket.id}/assign`, {});
      fetchData();
      openTicketDetail(selectedTicket);
    } catch (e) { console.error('Assign failed', e); }
  };

  const filteredTickets = activeTab === 'ALL' ? tickets : tickets.filter(t => t.status === activeTab);

  const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const slideUp = { hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-100 dark:border-cyan-900/50" />
            <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin absolute inset-0" />
            <Headphones className="w-6 h-6 text-cyan-500 absolute inset-0 m-auto glow-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-500 animate-pulse tracking-wide">Loading IT Help Desk...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { title: 'Open Tickets', value: stats?.open || 0, sub: `${stats?.highPriorityOpen || 0} high priority`, icon: AlertTriangle, color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/25', accent: '#f43f5e', subColor: stats?.highPriorityOpen > 0 ? 'text-rose-500' : 'text-slate-400' },
    { title: 'In Progress', value: stats?.inProgress || 0, sub: 'Assigned to team', icon: Loader2, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/25', accent: '#f59e0b', subColor: 'text-slate-400' },
    { title: 'Resolved Today', value: stats?.resolvedToday || 0, sub: 'Great work!', icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25', accent: '#10b981', subColor: 'text-emerald-500' },
    { title: 'Total Resolved', value: stats?.resolved || 0, sub: `${stats?.total || 0} total tickets`, icon: TrendingUp, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/25', accent: '#6366f1', subColor: 'text-slate-400' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-8 pb-10 max-w-[1600px] mx-auto">
      {/* ═══ HERO ═══ */}
      <motion.div variants={slideUp} className="relative overflow-hidden bg-gradient-to-br from-white/80 via-cyan-50/30 to-blue-50/40 dark:from-slate-900/80 dark:via-cyan-950/30 dark:to-blue-950/20 p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">IT Help Desk</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              <span className="animated-gradient-text">Welcome, {user?.name?.split(' ')[0] || 'IT Admin'}</span>{' '}
              <span className="inline-block hover:rotate-12 hover:scale-125 transition-transform cursor-default">🛠️</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage support tickets and resolve technical issues across the organization.</p>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-500" />
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </div>
        </div>
      </motion.div>

      {/* ═══ KPI CARDS ═══ */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => (
          <motion.div key={idx} variants={slideUp} className="relative glass-card p-6 overflow-hidden group card-hover-lift cursor-default">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.color}`}>
              <div className="shimmer-line absolute inset-0" />
            </div>
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

      {/* ═══ FILTER TABS ═══ */}
      <motion.div variants={slideUp} className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab === 'ALL' ? 'All Tickets' : STATUS_CONFIG[tab]?.label || tab}
            <span className="ml-1.5 text-[10px] opacity-70">
              ({tab === 'ALL' ? tickets.length : tickets.filter(t => t.status === tab).length})
            </span>
          </button>
        ))}
      </motion.div>

      {/* ═══ TWO-COLUMN: QUEUE + DETAIL ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Ticket Queue */}
        <motion.div variants={slideUp} className="xl:col-span-3 glass-card-elevated p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-500" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Ticket Queue</h3>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 opacity-60">
                <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="font-bold text-slate-400">No tickets in this category. All clear! 🎉</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
                const pc = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
                const StatusIcon = sc.icon;
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => openTicketDetail(ticket)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-300 dark:border-cyan-500/30 shadow-sm'
                        : 'bg-slate-50/80 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sc.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">{ticket.ticketNumber}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pc.color}`}>{pc.label}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{ticket.title}</p>
                      <p className="text-[10px] text-slate-400">{ticket.submittedBy?.name} · {ticket.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold text-slate-400">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
                      {ticket._count?.messages > 0 && (
                        <div className="flex items-center gap-1 justify-end mt-1 text-[10px] text-slate-400">
                          <MessageSquare className="w-3 h-3" />{ticket._count.messages}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Ticket Detail Panel */}
        <motion.div variants={slideUp} className="xl:col-span-2 glass-card-elevated p-6 flex flex-col max-h-[650px]">
          {!selectedTicket ? (
            <div className="flex flex-col items-center justify-center flex-1 opacity-50">
              <Headphones className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
              <p className="font-bold text-slate-400 text-sm">Select a ticket to view details</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-lg">{selectedTicket.ticketNumber}</span>
                  {(() => { const sc = STATUS_CONFIG[selectedTicket.status]; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${sc?.color}`}>{sc?.label}</span>; })()}
                  {(() => { const pc = PRIORITY_CONFIG[selectedTicket.priority]; return pc ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${pc.color}`}>{pc.label}</span> : null; })()}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-400 mt-1">by {selectedTicket.submittedBy?.name} ({selectedTicket.submittedBy?.email})</p>
              </div>

              {/* Description */}
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 mb-4 shrink-0">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedTicket.description}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 no-scrollbar min-h-0">
                {threadMessages.map((msg) => {
                  const isIT = ['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(msg.sender?.role);
                  return (
                    <div key={msg.id} className={`flex ${isIT ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                        msg.isInternal
                          ? 'bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 border-dashed'
                          : isIT
                            ? 'bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold text-slate-500">{msg.sender?.name}</span>
                          {msg.isInternal && <span className="text-[9px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-500/20 px-1 rounded">Internal</span>}
                          {isIT && !msg.isInternal && <span className="text-[9px] font-bold text-cyan-600 bg-cyan-100 dark:bg-cyan-500/20 px-1 rounded">IT</span>}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-3 flex-wrap shrink-0">
                {selectedTicket.status === 'OPEN' && (
                  <button onClick={assignToMe} className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 hover:bg-cyan-100 transition-colors">
                    Assign to me
                  </button>
                )}
                {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                  <button onClick={() => updateStatus('RESOLVED')} className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 transition-colors">
                    ✓ Mark Resolved
                  </button>
                )}
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 cursor-pointer">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="w-3 h-3 rounded" />
                  Internal note
                </label>
              </div>

              {/* Reply Input */}
              <div className="flex gap-2 shrink-0">
                <input
                  type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                  placeholder={isInternal ? "Add internal IT note..." : "Type your solution here..."}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                />
                <button onClick={sendReply} disabled={sending || !replyText.trim()} className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ═══ ANNOUNCEMENTS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnnouncementsWidget />
        <LeaveWidget />
      </div>
    </motion.div>
  );
};
