import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, Plus, X, Send, AlertTriangle, Clock, CheckCircle2, 
  Loader2, MessageSquare, ChevronRight, Bug, Shield, Search, 
  Upload, Bell, KeyRound, HelpCircle, Sparkles
} from 'lucide-react';

const CATEGORIES = [
  { value: 'Login/Auth', label: 'Login / Auth', icon: KeyRound },
  { value: 'OCR/Upload', label: 'OCR / Upload', icon: Upload },
  { value: 'Search/NLP', label: 'Search / NLP', icon: Search },
  { value: 'Versioning', label: 'Versioning', icon: Clock },
  { value: 'Notifications', label: 'Notifications', icon: Bell },
  { value: 'Access/Permission', label: 'Access / Permission', icon: Shield },
  { value: 'Other', label: 'Other', icon: HelpCircle },
];

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
  MEDIUM: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' },
  HIGH: { label: 'High', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border-red-300 dark:border-red-500/30' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Open', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400', icon: AlertTriangle },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', icon: Loader2 },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400', icon: CheckCircle2 },
};

export const TicketWidget = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showThread, setShowThread] = useState<any>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // New ticket form
  const [form, setForm] = useState({ title: '', description: '', category: 'Other', priority: 'MEDIUM' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets/my');
      setTickets(res.data);
    } catch (e) {
      console.error('Failed to fetch tickets', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/tickets', form);
      setShowModal(false);
      setForm({ title: '', description: '', category: 'Other', priority: 'MEDIUM' });
      fetchTickets();
    } catch (e) {
      console.error('Failed to submit ticket', e);
    } finally {
      setSubmitting(false);
    }
  };

  const openThread = async (ticket: any) => {
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      setShowThread(res.data);
      setThreadMessages(res.data.messages || []);
    } catch (e) {
      console.error('Failed to load ticket thread', e);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !showThread) return;
    setSending(true);
    try {
      const res = await api.post(`/tickets/${showThread.id}/messages`, { message: replyText });
      setThreadMessages(prev => [...prev, res.data]);
      setReplyText('');
    } catch (e) {
      console.error('Failed to send reply', e);
    } finally {
      setSending(false);
    }
  };

  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  return (
    <>
      {/* ═══ WIDGET CARD ═══ */}
      <div className="glass-card p-6 relative overflow-hidden">
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600">
          <div className="shimmer-line absolute inset-0" />
        </div>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">IT Support</h3>
              <p className="text-[10px] font-semibold text-slate-400">Submit & track issues</p>
            </div>
          </div>
          {openCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{openCount} active</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          Submit a Support Ticket
        </button>

        {/* Recent tickets */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs font-semibold text-slate-400">No tickets yet. All systems go! 🚀</p>
            </div>
          ) : (
            tickets.slice(0, 5).map((ticket) => {
              const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
              const StatusIcon = statusConf.icon;
              return (
                <button
                  key={ticket.id}
                  onClick={() => openThread(ticket)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all text-left group"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${statusConf.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ticket.title}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{ticket.ticketNumber} · {ticket.category}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ SUBMIT TICKET MODAL ═══ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Bug className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">Report an Issue</h2>
                      <p className="text-xs text-slate-400">Our IT team will respond shortly</p>
                    </div>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Issue Title *</label>
                  <input
                    type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                    placeholder="e.g. Cannot upload PDF documents"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm font-medium text-slate-900 dark:text-white transition-all outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon;
                      const isActive = form.category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setForm({...form, category: cat.value})}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            isActive
                              ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Priority</label>
                  <div className="flex gap-2">
                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => {
                      const conf = PRIORITY_CONFIG[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setForm({...form, priority: p})}
                          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            form.priority === p
                              ? `${conf.color} shadow-sm`
                              : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Description *</label>
                  <textarea
                    value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                    placeholder="Describe the issue in detail. Include steps to reproduce if possible..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm font-medium text-slate-900 dark:text-white transition-all outline-none resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.title.trim() || !form.description.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Ticket
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TICKET THREAD MODAL ═══ */}
      <AnimatePresence>
        {showThread && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => { setShowThread(null); setThreadMessages([]); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Thread Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-lg">{showThread.ticketNumber}</span>
                      {(() => {
                        const sc = STATUS_CONFIG[showThread.status] || STATUS_CONFIG.OPEN;
                        return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${sc.color}`}>{sc.label}</span>;
                      })()}
                      {(() => {
                        const pc = PRIORITY_CONFIG[showThread.priority as keyof typeof PRIORITY_CONFIG];
                        return pc ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pc.color}`}>{pc.label}</span> : null;
                      })()}
                    </div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">{showThread.title}</h2>
                    <p className="text-xs text-slate-400">Submitted by {showThread.submittedBy?.name} · {showThread.category}</p>
                  </div>
                  <button onClick={() => { setShowThread(null); setThreadMessages([]); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{showThread.description}</p>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {threadMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No replies yet. IT team will respond soon.</p>
                  </div>
                ) : (
                  threadMessages.map((msg) => {
                    const isIT = ['IT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(msg.sender?.role);
                    return (
                      <div key={msg.id} className={`flex ${isIT ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isIT
                            ? 'bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${isIT ? 'bg-cyan-500' : 'bg-indigo-500'}`}>
                              {msg.sender?.name?.charAt(0) || '?'}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{msg.sender?.name}</span>
                            {isIT && <span className="text-[9px] font-bold text-cyan-600 bg-cyan-100 dark:bg-cyan-500/20 dark:text-cyan-400 px-1.5 py-0.5 rounded">IT Team</span>}
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{msg.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5">{new Date(msg.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input */}
              {showThread.status !== 'CLOSED' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all"
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !replyText.trim()}
                      className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Resolved banner */}
              {(showThread.status === 'RESOLVED' || showThread.status === 'CLOSED') && (
                <div className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border-t border-emerald-200 dark:border-emerald-500/20 shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">This ticket has been resolved by IT.</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
