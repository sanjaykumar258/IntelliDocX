import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { Activity, FileText, Users, ShieldCheck, TrendingUp, TrendingDown, UploadCloud, Trash2, Settings, ShieldAlert, GitPullRequest, Sparkles, Zap, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketWidget } from '@/components/widgets/TicketWidget';
import { AnnouncementsWidget } from '@/components/widgets/AnnouncementsWidget';
import { LeaveWidget } from '@/components/widgets/LeaveWidget';
import { UserManagement } from '@/components/admin/UserManagement';
import { AuditLogs } from '@/components/admin/AuditLogs';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

/* ─── Animated Counter ─── */
const Counter = ({ from = 0, to, suffix = '' }: { from?: number; to: number; suffix?: string }) => {
  const count = useMotionValue(from);
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    const controls = animate(count, to, {
      duration: 1.8,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (val) => setDisplay(Math.round(val))
    });
    return controls.stop;
  }, [count, to]);

  return <span>{display}{suffix}</span>;
};

/* ─── Sparkline SVG ─── */
const Sparkline = ({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-draw"
      />
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-${color})`}
        opacity="0.5"
      />
    </svg>
  );
};

export const AdminDashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics/overview');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-900/50" />
            <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin absolute inset-0" />
            <Sparkles className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto glow-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse tracking-wide">Aggregating Global Telemetry...</p>
        </div>
      </div>
    );
  }

  const summary = stats?.summary || {};

  const statCards = [
    {
      title: 'Total Documents',
      value: summary.totalDocuments || 0,
      icon: FileText,
      trend: '+12%',
      isPositive: true,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/25',
      accent: '#6366f1',
      sparkData: [2, 5, 3, 7, 4, 8, 6],
    },
    {
      title: 'Active Workflows',
      value: summary.pendingWorkflows || 0,
      icon: GitPullRequest,
      trend: '-2%',
      isPositive: false,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-orange-500/25',
      accent: '#f59e0b',
      sparkData: [8, 6, 7, 4, 5, 3, 4],
    },
    {
      title: 'Active Users',
      value: summary.activeUsers || 0,
      icon: Users,
      trend: '+45%',
      isPositive: true,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25',
      accent: '#10b981',
      sparkData: [1, 3, 2, 5, 4, 7, 6],
    },
    {
      title: 'Blockchain Verified',
      value: summary.blockchainRegistered || 0,
      icon: ShieldCheck,
      trend: 'Secured',
      isPositive: true,
      color: 'from-purple-500 to-fuchsia-600',
      shadow: 'shadow-purple-500/25',
      accent: '#a855f7',
      sparkData: [3, 4, 5, 5, 6, 7, 8],
    },
  ];

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const slideUp = {
    hidden: { y: 24, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const chartData = stats?.docs?.categoryDistribution?.length > 0 
    ? stats.docs.categoryDistribution 
    : [
        { category: 'Mon', count: 12 }, { category: 'Tue', count: 19 },
        { category: 'Wed', count: 15 }, { category: 'Thu', count: 28 },
        { category: 'Fri', count: 22 }, { category: 'Sat', count: 35 },
        { category: 'Sun', count: 42 }
      ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-4 rounded-2xl shadow-2xl">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
          <p className="text-indigo-600 dark:text-indigo-400 font-black text-2xl">
            {payload[0].value} <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">assets</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getActivityIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('UPLOAD')) return <UploadCloud className="w-3.5 h-3.5 text-blue-500" />;
    if (act.includes('DELETE')) return <Trash2 className="w-3.5 h-3.5 text-red-500" />;
    if (act.includes('WORKFLOW') || act.includes('APPROV')) return <GitPullRequest className="w-3.5 h-3.5 text-purple-500" />;
    if (act.includes('LOGIN')) return <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />;
    return <Activity className="w-3.5 h-3.5 text-slate-500" />;
  };

  const getActivityColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('UPLOAD')) return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500' };
    if (act.includes('DELETE')) return { bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' };
    if (act.includes('WORKFLOW') || act.includes('APPROV')) return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-500' };
    if (act.includes('LOGIN')) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' };
    return { bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500' };
  };

  const getActionBadgeStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('APPROV')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (act.includes('UPLOAD')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (act.includes('DELETE')) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    if (act.includes('REJECT')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="space-y-8 pb-10 max-w-[1600px] mx-auto"
    >
      {/* ═══ HERO GREETING ═══ */}
      <motion.div variants={slideUp} className="relative overflow-hidden bg-gradient-to-br from-white/80 via-indigo-50/30 to-purple-50/40 dark:from-slate-900/80 dark:via-indigo-950/30 dark:to-purple-950/20 p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        {/* Decorative gradient blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  {isSuperAdmin ? 'Global System Mastery' : 'System Online'}
                </span>
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <ShieldAlert className="w-3 h-3 text-purple-500" />
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Root Access</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              <span className="animated-gradient-text">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return 'Good morning';
                  if (hour < 18) return 'Good afternoon';
                  return 'Good evening';
                })()}, {user?.name?.split(' ')[0] || (isSuperAdmin ? 'Super Admin' : 'Admin')}
              </span>{' '}
              <span className="inline-block hover:rotate-12 hover:scale-125 transition-transform origin-bottom-right cursor-default">👋</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Here's your {isSuperAdmin ? 'global mastery telemetry' : 'administrative overview'} for the workspace.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ TAB NAVIGATION ═══ */}
      <Tabs defaultValue="overview" className="space-y-8">
        <motion.div variants={slideUp}>
          <TabsList className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl h-14 border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <TabsTrigger value="overview" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-md transition-all">
              <BarChart3 className="w-4 h-4 mr-2" />Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-md transition-all">
              <Users className="w-4 h-4 mr-2" />Directory
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 data-[state=active]:shadow-md transition-all">
              <ShieldCheck className="w-4 h-4 mr-2" />Security Logs
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="overview" className="space-y-8 outline-none">
          {/* ═══ STAT CARDS ═══ */}
          <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {statCards.map((stat, idx) => (
              <motion.div 
                key={idx}
                variants={slideUp}
                className="relative glass-card p-6 overflow-hidden group card-hover-lift cursor-default"
              >
                {/* Animated top gradient bar */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.color}`}>
                  <div className="shimmer-line absolute inset-0" />
                </div>
                
                {/* Background glow on hover */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700`} />
                
                <div className="flex justify-between items-start mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${stat.isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                    {stat.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="space-y-1 relative z-10">
                    <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.title}</h3>
                    <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      <Counter to={stat.value} />
                    </div>
                  </div>
                  <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                    <Sparkline data={stat.sparkData} color={stat.accent} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ═══ CHARTS & ACTIVITY ═══ */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            
            {/* Area Chart */}
            <motion.div variants={slideUp} className="xl:col-span-3 glass-card-elevated p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-indigo-500" />
                    </div>
                    Asset Processing
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[42px]">Files verified over the active cycle.</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Live</span>
                </div>
              </div>
              
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35}/>
                        <stop offset="50%" stopColor="#818cf8" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.15} />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      animationDuration={2000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* System Pulse Timeline */}
            <motion.div variants={slideUp} className="xl:col-span-2 glass-card-elevated p-6 md:p-8 relative overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-purple-500 animate-spin-slow" />
                    </div>
                    System Pulse
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[42px]">Live audit stream.</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
                {stats?.recentActivity?.length > 0 ? (
                  stats.recentActivity.slice(0, 6).map((activity: any, idx: number) => {
                    const colors = getActivityColor(activity.action);
                    return (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 * idx, type: "spring", stiffness: 300, damping: 24 }}
                        className={`relative p-3.5 rounded-2xl border ${colors.border} ${colors.bg} hover:shadow-md transition-all duration-200 cursor-default group`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                            {getActivityIcon(activity.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{activity.documentName || 'System Event'}</span>
                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                                {formatDistanceToNow(new Date(activity.timestamp || activity.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border ${getActionBadgeStyle(activity.action)}`}>
                              {activity.action}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 opacity-60">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 float-y">
                      <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="font-bold text-slate-400 dark:text-slate-500 text-sm">No recent activity captured.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ═══ SUPPORT, ANNOUNCEMENTS & LEAVE ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={slideUp}>
              <TicketWidget />
            </motion.div>
            <motion.div variants={slideUp}>
              <AnnouncementsWidget />
            </motion.div>
            <motion.div variants={slideUp}>
              <LeaveWidget />
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="outline-none">
          <motion.div variants={slideUp}>
            <UserManagement />
          </motion.div>
        </TabsContent>

        <TabsContent value="audit" className="outline-none">
          <motion.div variants={slideUp}>
            <AuditLogs />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
