import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { loginSuccess } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, FileText, BrainCircuit, ShieldCheck, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('admin@acme.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken } = response.data;
      const decoded: any = jwtDecode(accessToken);

      const user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        organizationId: decoded.organizationId,
        name: decoded.email.split('@')[0]
      };
      dispatch(loginSuccess({ token: accessToken, user }));
      navigate(`/`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const slideIn = {
    hidden: { x: 20, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden font-sans">
      
      {/* LEFT PANEL - BRANDING & VISUALS */}
      <div className="relative w-full md:w-1/2 min-h-[40vh] md:min-h-screen flex flex-col justify-center items-center overflow-hidden">
        
        {/* Animated Gradient Background */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-100 dark:from-slate-900 dark:via-purple-900/40 dark:to-indigo-950 bg-[length:300%_300%] z-0"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0"></div>

        {/* Floating Document Cards */}
        <div className="absolute inset-0 z-0 overflow-hidden perspective-[1000px]">
          <motion.div 
            animate={{ y: [0, -20, 0], rotateX: [10, 15, 10], rotateY: [-10, -5, -10] }} 
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] left-[10%] w-48 h-64 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-4 text-indigo-600 dark:text-indigo-400"
          >
            <BrainCircuit className="w-12 h-12" />
            <div className="w-24 h-2 bg-indigo-200 dark:bg-indigo-900/50 rounded-full" />
            <div className="w-16 h-2 bg-indigo-200 dark:bg-indigo-900/50 rounded-full" />
          </motion.div>

          <motion.div 
            animate={{ y: [0, 25, 0], rotateX: [-10, -5, -10], rotateY: [15, 10, 15] }} 
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] right-[10%] w-56 h-72 bg-white/30 dark:bg-slate-800/30 backdrop-blur-lg border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-4 text-purple-600 dark:text-purple-400"
          >
            <ShieldCheck className="w-16 h-16" />
            <div className="w-32 h-3 bg-purple-200 dark:bg-purple-900/50 rounded-full" />
            <div className="w-20 h-2 bg-purple-200 dark:bg-purple-900/50 rounded-full" />
          </motion.div>
        </div>

        {/* Branding Content */}
        <div className="relative z-10 px-8 max-w-lg text-center md:text-left flex flex-col items-center md:items-start">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Intelli<span className="text-indigo-600 dark:text-indigo-400">DocX</span>
            </h1>
          </motion.div>

          <div className="flex flex-wrap justify-center md:justify-start gap-x-2 text-lg md:text-2xl font-medium text-slate-700 dark:text-slate-300">
            {["Intelligent", "Document", "Management,", "Reimagined."].map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + (i * 0.15), ease: "easeOut" }}
              >
                {word}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - LOGIN FORM */}
      <div className="w-full md:w-1/2 min-h-[60vh] md:min-h-screen flex items-center justify-center p-6 md:p-12 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Glassmorphism Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl rounded-3xl p-8 relative overflow-hidden">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to access your secure workspace.</p>
            </div>

            <motion.form 
              onSubmit={handleLogin} 
              className="space-y-6"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center font-medium"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Float Label Input: Email */}
              <motion.div variants={slideIn} className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  className="peer w-full h-14 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pt-4 pb-1 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-transparent"
                  placeholder="name@example.com"
                />
                <label 
                  htmlFor="email"
                  className={`absolute left-4 transition-all duration-200 pointer-events-none text-slate-500 dark:text-slate-400 ${
                    focusedInput === 'email' || email ? 'text-xs top-2 font-medium text-indigo-600 dark:text-indigo-400' : 'text-sm top-4'
                  }`}
                >
                  Email Address
                </label>
              </motion.div>

              {/* Float Label Input: Password */}
              <motion.div variants={slideIn} className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  className="peer w-full h-14 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-12 pt-4 pb-1 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-transparent"
                  placeholder="Password"
                />
                <label 
                  htmlFor="password"
                  className={`absolute left-4 transition-all duration-200 pointer-events-none text-slate-500 dark:text-slate-400 ${
                    focusedInput === 'password' || password ? 'text-xs top-2 font-medium text-indigo-600 dark:text-indigo-400' : 'text-sm top-4'
                  }`}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </motion.div>

              <motion.div variants={slideIn} className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 border border-slate-300 dark:border-slate-700 rounded-md group-hover:border-indigo-500 transition-colors">
                    <input type="checkbox" className="peer sr-only" />
                    <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 select-none group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                  Forgot password?
                </a>
              </motion.div>

              <motion.div variants={slideIn} className="pt-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/25 transition-all overflow-hidden relative group"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
                  {loading ? (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Authenticating...
                    </motion.div>
                  ) : (
                    "Sign In to Workspace"
                  )}
                </Button>
              </motion.div>

            </motion.form>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <BrainCircuit className="w-3 h-3 text-indigo-500" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">Powering</span>
                <ShieldCheck className="w-3 h-3 text-purple-500" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">AI & BLOCKCHAIN</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
