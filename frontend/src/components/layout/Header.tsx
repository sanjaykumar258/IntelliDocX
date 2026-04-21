import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, User, CheckCircle, Info, AlertTriangle, XCircle, BellRing, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { socketService } from '@/api/socketService';
import { Notification } from '@/types';
import { api } from '@/api/client';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/mode-toggle';
import { logout, updateUserProfile } from '@/features/auth/authSlice';
import { RootState } from '@/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch latest profile (including avatar) on mount to keep Header in sync
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/users/me');
        if (data.user) {
          dispatch(updateUserProfile({
            name: data.user.name,
            avatarUrl: data.user.avatarUrl || null,
          }));
        }
      } catch (err) {
        // Non-critical — header will use cached/JWT data
      }
    };
    fetchProfile();
  }, [dispatch]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        // Only show latest 15 to keep UI clean, prioritize unread
        const sorted = response.data.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 15);
        setNotifications(sorted);
        setUnreadCount(sorted.filter((n: any) => !n.isRead).length);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    fetchNotifications();

    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 15));
      setUnreadCount(prev => prev + 1);
    };

    if (socketService.socket) {
      socketService.socket.on('NOTIFICATION', handleNotification);
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('NOTIFICATION', handleNotification);
      }
    };
  }, [socketService.socket]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const markRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const markAllRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.put('/notifications/mark-all-read');
      // Visually remove them from the dropdown to give immediate "cleared" feedback
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Alternatively, we could do setNotifications([]) if we strictly want them gone.
      // But keeping them as muted read states is often better, so users can still see them temporarily.
      // We will clear the fully read ones after a moment to simulate "Clear All".
      setTimeout(() => {
        setNotifications([]);
      }, 400); 
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/documents?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'ERROR': return <XCircle className="h-4 w-4 text-rose-500" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <header className={cn(
      "h-16 px-6 flex items-center justify-between sticky top-0 z-50 transition-all duration-300 scroll-gradient-border",
      isScrolled ? "glass shadow-sm scrolled" : "bg-transparent"
    )}>
      <div className="flex items-center w-full max-w-md">
        <motion.form 
          onSubmit={handleSearch} 
          className="relative w-full"
          animate={{ width: isSearchFocused ? "100%" : "90%" }}
        >
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
            isSearchFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            type="search"
            placeholder="Search Intelligence..."
            className={cn(
              "h-10 pl-10 transition-all duration-300 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-transparent",
              isSearchFocused && "bg-white dark:bg-slate-900 shadow-lg ring-1 ring-primary/20"
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </motion.form>
      </div>

      <div className="flex items-center space-x-4">
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("relative group rounded-xl", unreadCount > 0 && "bell-pulse")}>
              <Bell className={cn("h-5 w-5 transition-colors", unreadCount > 0 ? "text-primary" : "text-slate-600 dark:text-slate-400 group-hover:text-primary")} />
              {unreadCount > 0 && (
                <Badge className="absolute top-0.5 right-0.5 h-4 min-w-[16px] flex items-center justify-center p-0.5 bg-gradient-to-r from-red-500 to-rose-600 text-[9px] text-white border-2 border-background rounded-full shadow-lg shadow-red-500/30 font-bold">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[360px] p-0 glass shadow-2xl overflow-hidden border-slate-200/50 dark:border-slate-800/50 rounded-2xl" align="end">
            <div className="bg-slate-50/90 dark:bg-slate-900/90 px-4 py-3 flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BellRing className="w-3.5 h-3.5 text-primary dark:text-primary" />
                </div>
                <span className="font-black text-sm text-slate-900 dark:text-white">Notifications</span>
              </div>
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllRead} 
                  className="h-7 px-2.5 text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors rounded-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="max-h-[400px] overflow-y-auto no-scrollbar p-2 bg-white/50 dark:bg-slate-950/50">
              <AnimatePresence>
                {notifications.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">You're all caught up!</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">No new notifications</p>
                  </motion.div>
                ) : (
                  notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mb-1.5 last:mb-0"
                    >
                      <div
                        className={cn(
                          "relative flex flex-col p-3.5 rounded-xl transition-all duration-200 border",
                          n.isRead 
                            ? "bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-60" 
                            : "bg-white dark:bg-slate-800 border-primary dark:border-primary/20 shadow-sm"
                        )}
                      >
                        {/* Unread indicator */}
                        {!n.isRead && (
                          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
                        )}
                        
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 p-2 rounded-xl flex-shrink-0",
                            n.isRead ? "bg-slate-100 dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900 shadow-inner"
                          )}>
                            {getIcon(n.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className={cn(
                              "text-[13px] font-black tracking-tight mb-1",
                              n.isRead ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-white"
                            )}>
                              {n.title}
                            </h4>
                            <p className={cn(
                              "text-[11px] leading-relaxed font-semibold mb-2 pr-2",
                              n.isRead ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-200"
                            )}>
                              {n.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                              </span>
                              {!n.isRead && (
                                <button 
                                  onClick={(e) => markRead(n.id, e)}
                                  className="text-[10px] font-bold text-primary dark:text-primary hover:text-primary dark:hover:text-primary transition-colors"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 p-0 rounded-xl overflow-hidden border border-white/20 dark:border-slate-800/50 shadow-sm">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-primary/20 to-purple-500/20 flex items-center justify-center text-primary dark:text-primary font-bold text-xs">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2 glass shadow-2xl" align="end" forceMount>
            <DropdownMenuLabel className="font-normal px-2 py-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{user?.role}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10 dark:bg-slate-800/50" />
            <div className="py-1">
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <User className="mr-2 h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer text-red-600 focus:text-red-700 mt-1 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="text-sm font-bold">Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};


