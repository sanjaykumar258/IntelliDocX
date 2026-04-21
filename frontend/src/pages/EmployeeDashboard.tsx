import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { socketService } from '@/api/socketService';
import { useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { Activity, FileText, TrendingUp, TrendingDown, GitPullRequest, Cloud, Upload, Sparkles, Zap, Rocket, FolderOpen, Bot } from 'lucide-react';
import { TicketWidget } from '@/components/widgets/TicketWidget';
import { AnnouncementsWidget } from '@/components/widgets/AnnouncementsWidget';
import { LeaveWidget } from '@/components/widgets/LeaveWidget';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setIntelliBotOpen } from '@/features/ui/uiSlice';

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
        <linearGradient id={`spark-emp-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sparkline-draw" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#spark-emp-${color.replace('#', '')})`} opacity="0.5" />
    </svg>
  );
};

/* ─── Circular Progress Gauge ─── */
const CircularGauge = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="68" height="68" className="transform -rotate-90">
        <circle cx="34" cy="34" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-800" />
        <motion.circle 
          cx="34" cy="34" r="28" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-black text-slate-900 dark:text-white">{value}</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase">{label}</span>
      </div>
    </div>
  );
};

export const EmployeeDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await api.get('/analytics/me');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    if (socketService.socket) {
      socketService.socket.on('document:uploaded', fetchDashboardData);
      socketService.socket.on('document:deleted', fetchDashboardData);
      socketService.socket.on('workflow:updated', fetchDashboardData);
      socketService.socket.on('workflow:escalated', fetchDashboardData);
      socketService.socket.on('workflow:approved', fetchDashboardData);
      socketService.socket.on('workflow:rejected', fetchDashboardData);
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('document:uploaded', fetchDashboardData);
        socketService.socket.off('document:deleted', fetchDashboardData);
        socketService.socket.off('workflow:updated', fetchDashboardData);
        socketService.socket.off('workflow:escalated', fetchDashboardData);
        socketService.socket.off('workflow:approved', fetchDashboardData);
        socketService.socket.off('workflow:rejected', fetchDashboardData);
      }
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-900/50" />
            <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin absolute inset-0" />
            <Rocket className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto glow-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse tracking-wide">Loading Workspace Dynamics...</p>
        </div>
      </div>
    );
  }
  const storageMB = data?.myStorageBytes ? Math.round(data.myStorageBytes / (1024 * 1024)) : 0;

  const statCards = [
    {
      title: 'My Documents',
      value: data?.myDocumentsCount || 0,
      icon: FileText,
      trend: '+2%',
      isPositive: true,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/25',
      accent: '#6366f1',
      sparkData: [1, 2, 2, 3, 3, 4, 4],
    },
    {
      title: 'Pending Tasks',
      value: data?.myPendingWorkflows || 0,
      icon: GitPullRequest,
      trend: 'Action Req',
      isPositive: false,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-orange-500/25',
      accent: '#f59e0b',
      sparkData: [3, 2, 4, 3, 2, 1, 1],
    },
    {
      title: 'Approved Docs',
      value: data?.myApprovedWorkflows || 0,
      icon: TrendingUp,
      trend: 'Verified',
      isPositive: true,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25',
      accent: '#10b981',
      sparkData: [2, 3, 4, 5, 6, 7, 8],
    },
    {
      title: 'Storage Used',
      value: storageMB,
      icon: Cloud,
      trend: `${storageMB} MB`,
      isPositive: true,
      color: 'from-purple-500 to-fuchsia-600',
      shadow: 'shadow-purple-500/25',
      accent: '#a855f7',
      sparkData: [5, 8, 10, 13, 16, 20, 24],
    },
  ];

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const slideUp = {
    hidden: { y: 24, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const chartData = data?.categoryDistribution || [];
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const totalDocs = chartData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pct = totalDocs > 0 ? ((payload[0].value / totalDocs) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-4 rounded-2xl shadow-2xl">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{payload[0].name}</p>
          <p className="text-indigo-600 dark:text-indigo-400 font-black text-xl">
            {payload[0].value} <span className="text-slate-400 text-xs font-semibold">({pct}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const quickActions = [
    {
      title: 'Upload Document',
      description: 'Add new files to your vault',
      icon: Upload,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      onClick: () => navigate('/documents'),
    },
    {
      title: 'Check Approvals',
      description: 'View pending task status',
      icon: GitPullRequest,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      onClick: () => navigate('/workflows'),
    },
    {
      title: 'Ask IntelliBot',
      description: 'AI-powered document assistant',
      icon: Bot,
      color: 'from-purple-500 to-fuchsia-600',
      shadow: 'shadow-purple-500/20',
      onClick: () => dispatch(setIntelliBotOpen(true)),
    },
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="space-y-8 pb-10 max-w-[1600px] mx-auto"
    >
      {/* ═══ HERO GREETING ═══ */}
      <motion.div variants={slideUp} className="relative overflow-hidden bg-gradient-to-br from-white/80 via-blue-50/20 to-indigo-50/30 dark:from-slate-900/80 dark:via-blue-950/20 dark:to-indigo-950/10 p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Sparkles className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Personal Workspace</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
              <span className="animated-gradient-text">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return 'Good morning';
                  if (hour < 18) return 'Good afternoon';
                  return 'Good evening';
                })()}, {user?.name?.split(' ')[0] || 'Employee'}
              </span>{' '}
              <span className="inline-block hover:rotate-12 hover:scale-125 transition-transform origin-bottom-right cursor-default">👋</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Here's your personal operational overview.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <motion.div variants={slideUp}>
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Rocket className="w-5 h-5 text-indigo-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <motion.button
              key={idx}
              onClick={action.onClick}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
              whileTap={{ scale: 0.98 }}
              className="relative glass-card p-5 text-left overflow-hidden group cursor-pointer"
            >
              <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${action.color} opacity-[0.05] group-hover:opacity-[0.12] rounded-full blur-2xl transition-opacity duration-500`} />
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${action.color} flex items-center justify-center shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{action.title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{action.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={slideUp}
            className="relative glass-card p-6 overflow-hidden group card-hover-lift cursor-default"
          >
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.color}`}>
              <div className="shimmer-line absolute inset-0" />
            </div>
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
                  {stat.title === 'Storage Used' ? (
                    <span><Counter to={stat.value} /> <span className="text-xl font-bold text-slate-400">MB</span></span>
                  ) : (
                    <Counter to={stat.value} />
                  )}
                </div>
              </div>
              {stat.title === 'Storage Used' ? (
                <div className="opacity-80">
                  <CircularGauge value={stat.value} max={100} label="MB" color="#a855f7" />
                </div>
              ) : (
                <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <Sparkline data={stat.sparkData} color={stat.accent} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ CHARTS & ACTIVITY ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Pie Chart */}
        <motion.div variants={slideUp} className="glass-card-elevated p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                Personal Contributions
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[42px]">Breakdown of assets you have contributed.</p>
            </div>
          </div>
          <div className="h-[320px] relative">
            {chartData.length > 0 ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ marginTop: '-18px' }}>
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-900 dark:text-white"><Counter to={totalDocs} /></div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="category"
                      stroke="transparent"
                      animationDuration={1500}
                    >
                      {chartData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value: string) => <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              /* ═══ BEAUTIFUL EMPTY STATE ═══ */
              <div className="flex flex-col items-center justify-center h-full relative">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-transparent rounded-2xl" />
                <motion.div 
                  animate={{ y: [-6, 6, -6] }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-5 shadow-xl"
                >
                  <FolderOpen className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
                </motion.div>
                <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1 relative z-10">No contributions yet</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 text-center max-w-xs relative z-10">Upload your first document to start building your contribution profile.</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/documents')}
                  className="relative z-10 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload Document
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Activity Timeline */}
        <motion.div variants={slideUp} className="glass-card-elevated p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full pointer-events-none" />
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-500" />
                </div>
                My Activity
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-[42px]">Live tracking of your interactions.</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
            {data?.recentActivity?.length > 0 ? (
              data.recentActivity.slice(0, 6).map((activity: any, idx: number) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * idx, type: "spring", stiffness: 300, damping: 24 }}
                  className="relative p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 hover:shadow-md transition-all duration-200 cursor-default group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getActivityDotColor(activity.action)} shrink-0 ring-4 ring-white dark:ring-slate-900`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{activity.documentName || 'Personal Event'}</span>
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
              ))
            ) : (
              /* ═══ BEAUTIFUL EMPTY STATE ═══ */
              <div className="flex flex-col items-center justify-center py-12 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-blue-500/5 to-transparent rounded-2xl" />
                <motion.div 
                  animate={{ y: [-5, 5, -5] }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4 shadow-lg"
                >
                  <Activity className="w-8 h-8 text-emerald-400 dark:text-emerald-500" />
                </motion.div>
                <p className="font-bold text-slate-500 dark:text-slate-400 text-sm relative z-10">No recent activity yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 relative z-10">Your actions will appear here as you interact.</p>
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
    </motion.div>
  );
};

/* ─── Helpers ─── */
function getActionBadgeStyle(action: string) {
  const act = action.toUpperCase();
  if (act.includes('APPROV')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (act.includes('UPLOAD')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  if (act.includes('DELETE')) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
}

function getActivityDotColor(action: string) {
  const act = action.toUpperCase();
  if (act.includes('APPROV')) return 'bg-emerald-500';
  if (act.includes('UPLOAD')) return 'bg-blue-500';
  if (act.includes('DELETE')) return 'bg-red-500';
  return 'bg-slate-400';
}

