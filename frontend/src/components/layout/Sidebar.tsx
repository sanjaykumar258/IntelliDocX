import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { LayoutDashboard, FileText, GitPullRequest, Settings, ChevronLeft, Menu, LogOut, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = '/login';
  };

  // Determine dashboard path based on role
  const getDashboardPath = () => {
    const role = user?.role;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return '/dashboard/admin';
    if (role === 'IT_MANAGER') return '/dashboard/it';
    if (role === 'HR_MANAGER') return '/dashboard/hr';
    if (['MANAGER', 'TEAM_LEAD'].includes(role || '')) return '/dashboard/manager';
    if (role === 'GUEST') return '/dashboard/guest';
    return '/dashboard/employee';
  };

  const isAdminOrAbove = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role || '');

  const navItems = [
    {
      title: 'Dashboard',
      href: getDashboardPath(),
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: 'Documents',
      href: '/documents',
      icon: FileText,
      show: !['HR_MANAGER', 'IT_MANAGER'].includes(user?.role || ''),
    },
    {
      title: user?.role === 'EMPLOYEE' ? 'My Approvals' : 'Workflows',
      href: user?.role === 'EMPLOYEE' ? '/my-approvals' : '/workflows',
      icon: GitPullRequest,
      show: !['GUEST', 'HR_MANAGER', 'IT_MANAGER'].includes(user?.role || ''),
    },
    {
      title: 'Audit Logs',
      href: '/audit-logs',
      icon: ClipboardList,
      show: isAdminOrAbove,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
      show: user?.role !== 'GUEST',
    },
  ].filter(item => item.show);

  return (
    <>
    {/* Hamburger for Mobile */}
    <div className="lg:hidden fixed top-4 left-4 z-[60]">
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="p-2 rounded-xl glass shadow-lg text-slate-600 dark:text-slate-400"
      >
        <Menu className="w-5 h-5" />
      </button>
    </div>

    {/* Mobile Overlay */}
    <AnimatePresence>
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </AnimatePresence>

    <motion.aside
      initial={false}
      animate={{ 
        width: collapsed ? 80 : 256,
        x: mobileOpen ? 0 : (window.innerWidth < 1024 ? -256 : 0)
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "fixed lg:relative flex flex-col h-screen bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl z-50 transition-colors duration-300",
        className
      )}
    >
      {/* Subtle Right Border Gradient */}
      <div className="absolute right-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between h-20 px-6 border-b border-slate-200/50 dark:border-slate-800/50">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center shadow-md">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight pl-1">
                IntelliDocX
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);

          return (
            <Link key={item.href} to={item.href} className="relative block group">
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-primary/10 dark:from-purple-500/20 dark:to-primary/20 border border-primary/20 rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              <div
                className={cn(
                  "relative flex items-center h-12 px-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-primary dark:text-primary font-semibold" 
                    : "text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-800/50",
                  collapsed ? "justify-center" : "justify-start"
                )}
                title={collapsed ? item.title : undefined}
              >
                <div className="relative flex items-center justify-center">
                  <item.icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-110", isActive && "text-primary dark:text-primary")} />
                  {isActive && (
                    <motion.div 
                      layoutId="activeIconGlow"
                      className="absolute inset-0 bg-primary blur-md opacity-40 rounded-full"
                    />
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 truncate group-hover:translate-x-1 transition-transform duration-200"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold shadow-md shrink-0 overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user?.name || 'Admin User'}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 truncate">
                      {user?.role || 'ADMIN'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="p-2 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all group"
                title="Logout"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
    </>
  );
};
