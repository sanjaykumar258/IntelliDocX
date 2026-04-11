import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, Download as DownloadIcon, Activity, Key, Globe, EyeOff, Lock, Eye } from 'lucide-react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { format } from 'date-fns';

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

/* ─── Static Visual Tracker (Placeholder Sparkline equivalent for Guest) ─── */
const AccessTracker = ({ color }: { color: string }) => {
  return (
    <div className="flex items-center gap-1">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ height: 4 }}
          animate={{ height: [4, 12, 4] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
          className={`w-1.5 rounded-full ${color}`}
        />
      ))}
    </div>
  );
};


export const GuestDashboard = () => {
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading for the guest portal
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800" />
            <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-slate-500 animate-spin absolute inset-0" />
            <Shield className="w-6 h-6 text-slate-400 absolute inset-0 m-auto" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse tracking-wide">Securing Guest Session...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Global Read Access',
      value: 1,
      icon: Eye,
      trend: 'Active',
      isPositive: true,
      color: 'from-slate-400 to-slate-600',
      shadow: 'shadow-slate-500/20',
      accent: 'bg-slate-400',
    },
    {
      title: 'Encrypted Vaults',
      value: 0,
      icon: Lock,
      trend: 'Protected',
      isPositive: true,
      color: 'from-slate-500 to-slate-700',
      shadow: 'shadow-slate-600/20',
      accent: 'bg-slate-500',
    },
    {
      title: 'Current Sessions',
      value: 1,
      icon: Activity,
      trend: 'Live',
      isPositive: true,
      color: 'from-slate-600 to-slate-800',
      shadow: 'shadow-slate-700/20',
      accent: 'bg-slate-600',
    }
  ];

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const slideUp = {
    hidden: { y: 24, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="space-y-8 pb-10 max-w-[1600px] mx-auto"
    >
      {/* ═══ HERO GREETING ═══ */}
      <motion.div variants={slideUp} className="relative overflow-hidden bg-gradient-to-br from-white/80 via-slate-50/50 to-slate-100/80 dark:from-slate-900/80 dark:via-slate-800/20 dark:to-slate-950/40 p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-slate-300/10 dark:bg-slate-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-slate-400/5 dark:bg-slate-600/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20">
                <Globe className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">External Access Portal</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20">
                <Shield className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Read-Only</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-slate-800 dark:text-slate-100">
              Welcome, {user?.name?.split(' ')[0] || 'Guest'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">You are currently operating in restricted guest mode.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2">
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ QUICK ACCESS ACTIONS ═══ */}
      <motion.div variants={slideUp}>
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-slate-500" />
          Available Guest Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.button
            onClick={() => navigate('/documents')}
            whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            whileTap={{ scale: 0.98 }}
            className="relative glass-card p-5 text-left overflow-hidden group cursor-pointer"
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-slate-400 to-slate-600 opacity-[0.05] group-hover:opacity-[0.12] rounded-full blur-2xl transition-opacity duration-500`} />
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/20 group-hover:scale-110 transition-transform duration-300`}>
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Browse Public Hub</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Search available documents</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => navigate('/documents')}
            whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            whileTap={{ scale: 0.98 }}
            className="relative glass-card p-5 text-left overflow-hidden group cursor-pointer"
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-slate-500 to-slate-800 opacity-[0.05] group-hover:opacity-[0.12] rounded-full blur-2xl transition-opacity duration-500`} />
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-500 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-600/20 group-hover:scale-110 transition-transform duration-300`}>
                <DownloadIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Downloads</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Access your shared files</p>
              </div>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={slideUp}
            className="relative glass-card p-6 overflow-hidden group card-hover-lift cursor-default"
          >
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.color}`}>
              <div className="shimmer-line absolute inset-0 opacity-50" />
            </div>
            <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.05] rounded-full blur-3xl transition-opacity duration-700`} />
            
            <div className="flex justify-between items-start mb-5">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400`}>
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
              <div className="opacity-40">
                 <AccessTracker color={stat.accent} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ PERMISSION NOTICE ═══ */}
      <motion.div variants={slideUp} className="glass-card-elevated p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
         <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />
         <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800/50 flex flex-shrink-0 items-center justify-center shadow-inner">
            <EyeOff className="w-10 h-10 text-slate-400" />
         </div>
         <div className="flex-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Restricted Operating Environment</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
              As a guest user, your telemetry and actions are restricted to public, shared directories. Direct editing, workflow approval, and deep analytics are disabled for your account level. Contact an administrator if you require elevated privileges.
            </p>
         </div>
      </motion.div>

    </motion.div>
  );
};
