import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, User, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { socketService } from '@/api/socketService';
import { Notification } from '@/types';
import { api } from '@/api/client';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/mode-toggle';
import { logout } from '@/features/auth/authSlice';
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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data);
        setUnreadCount(response.data.filter((n: any) => !n.isRead).length);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    fetchNotifications();

    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
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

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'ERROR': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-indigo-500" />;
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
            isSearchFocused ? "text-indigo-500" : "text-muted-foreground"
          )} />
          <Input
            type="search"
            placeholder="Search Intelligence..."
            className={cn(
              "h-10 pl-10 transition-all duration-300 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border-transparent",
              isSearchFocused && "bg-white dark:bg-slate-900 shadow-lg ring-1 ring-indigo-500/20"
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
              <Bell className={cn("h-5 w-5 transition-colors", unreadCount > 0 ? "text-indigo-500" : "text-slate-600 dark:text-slate-400 group-hover:text-indigo-500")} />
              {unreadCount > 0 && (
                <Badge className="absolute top-0.5 right-0.5 h-4 min-w-[16px] flex items-center justify-center p-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-[9px] text-white border-2 border-background rounded-full shadow-lg shadow-indigo-500/30">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-2 glass shadow-2xl" align="end">
            <DropdownMenuLabel className="flex justify-between items-center px-2 py-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead} className="text-[10px] h-7 px-2 text-indigo-600">
                  Clear all
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10 dark:bg-slate-800/50" />
            <div className="max-h-[350px] overflow-y-auto no-scrollbar py-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No new alerts</div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={cn(
                      "flex flex-col items-start p-3 mb-1 rounded-xl focus:bg-indigo-500/5 cursor-pointer",
                      !n.isRead ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : ''
                    )}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm">{getIcon(n.type)}</div>
                      <span className="font-bold text-xs flex-1 text-slate-800 dark:text-slate-200">{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 pl-8">{n.message}</p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 p-0 rounded-xl overflow-hidden border border-white/20 dark:border-slate-800/50 shadow-sm">
              <div className="h-full w-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
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
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg cursor-pointer">
                <User className="mr-2 h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer text-red-600 focus:text-red-700 mt-1">
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

