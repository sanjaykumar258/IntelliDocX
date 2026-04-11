import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { IntelliBot } from '@/components/chat/IntelliBot';
import { socketService } from '@/api/socketService';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export const DashboardLayout = () => {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(token);
    }
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-background mesh-gradient-bg">
      {/* Floating ambient orbs for depth */}
      <div className="floating-orb orb-1" style={{ top: '10%', right: '15%' }} />
      <div className="floating-orb orb-2" style={{ bottom: '20%', left: '10%' }} />
      <div className="floating-orb orb-3" style={{ top: '60%', right: '30%' }} />

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-full w-full overflow-auto p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <div style={{
        position: 'fixed',
        bottom: '24px', 
        right: '24px',
        zIndex: 9999
      }}>
        <IntelliBot />
      </div>
    </div>
  );
};
