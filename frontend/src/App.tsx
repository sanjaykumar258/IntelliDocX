import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/theme-provider';

// Lazy load page components for code splitting
const AdminDashboard        = lazy(() => import('@/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ManagerDashboard      = lazy(() => import('@/pages/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const EmployeeDashboard     = lazy(() => import('@/pages/EmployeeDashboard').then(m => ({ default: m.EmployeeDashboard })));
const DocumentsPage         = lazy(() => import('@/pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const WorkflowsPage         = lazy(() => import('@/pages/WorkflowsPage').then(m => ({ default: m.WorkflowsPage })));
const EmployeeApprovalsPage = lazy(() => import('@/pages/EmployeeApprovalsPage').then(m => ({ default: m.EmployeeApprovalsPage })));
const SettingsPage          = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AuditLogPage          = lazy(() => import('@/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const GuestDashboard        = lazy(() => import('@/pages/GuestDashboard').then(m => ({ default: m.GuestDashboard })));
const ITDashboard           = lazy(() => import('@/pages/ITDashboard').then(m => ({ default: m.ITDashboard })));
const HRDashboard           = lazy(() => import('@/pages/HRDashboard').then(m => ({ default: m.HRDashboard })));

// Full-screen loading spinner shown while lazy chunks load
const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Initializing IntelliDocX...
      </p>
    </div>
  </div>
);

const Unauthorized = () => (
  <div className="flex items-center justify-center h-[calc(100vh-64px)]">
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold text-red-600">Access Denied</h1>
      <p className="text-gray-600">You do not have permission to view this page.</p>
      <Button onClick={() => window.history.back()}>Go Back</Button>
    </div>
  </div>
);

// Redirect to the correct dashboard based on the logged-in user's role
const RoleBasedRedirect = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return <Navigate to="/dashboard/admin" replace />;
    case 'IT_MANAGER':
      return <Navigate to="/dashboard/it" replace />;
    case 'HR_MANAGER':
      return <Navigate to="/dashboard/hr" replace />;
    case 'MANAGER':
    case 'TEAM_LEAD':
      return <Navigate to="/dashboard/manager" replace />;
    case 'GUEST':
      return <Navigate to="/dashboard/guest" replace />;
    default:
      return <Navigate to="/dashboard/employee" replace />;
  }
};

const hexToHSL = (H: string) => {
  let r = 0, g = 0, b = 0;
  if (H.length === 4) {
    r = parseInt(H[1] + H[1], 16);
    g = parseInt(H[2] + H[2], 16);
    b = parseInt(H[3] + H[3], 16);
  } else if (H.length === 7) {
    r = parseInt(H.substring(1, 3), 16);
    g = parseInt(H.substring(3, 5), 16);
    b = parseInt(H.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;
  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
};

// Sync global settings from Redux to DOM
const SettingsSyncer = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Apply accent color
    const accent = user?.accentColor || localStorage.getItem('accent') || '#6366f1';
    document.documentElement.style.setProperty('--app-accent', accent);
    document.documentElement.style.setProperty('--primary', hexToHSL(accent));
    
    // Theme is now handled directly by ThemeProvider and component calls
    // to avoid race conditions with Redux synchronization.
  }, [user?.accentColor]);

  return null;
};

function App() {
  return (
    // ThemeProvider wraps everything so dark/light mode works throughout the app
    <ThemeProvider defaultTheme="dark" storageKey="intellidocx-theme">
      <Provider store={store}>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* All authenticated routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardLayout />}>

                  {/* Admin Routes (Super Admin + Admin) */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
                    <Route path="dashboard/admin" element={<AdminDashboard />} />
                    <Route path="audit-logs"       element={<AuditLogPage />} />
                  </Route>

                  {/* Manager Routes (Manager + Team Lead) */}
                  <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'TEAM_LEAD']} />}>
                    <Route path="dashboard/manager" element={<ManagerDashboard />} />
                  </Route>

                  {/* IT Dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['IT_MANAGER']} />}>
                    <Route path="dashboard/it" element={<ITDashboard />} />
                  </Route>

                  {/* HR Dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['HR_MANAGER']} />}>
                    <Route path="dashboard/hr" element={<HRDashboard />} />
                  </Route>

                  {/* Employee Routes */}
                  <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
                    <Route path="dashboard/employee" element={<EmployeeDashboard />} />
                    <Route path="my-approvals"        element={<EmployeeApprovalsPage />} />
                  </Route>

                  {/* Guest Routes */}
                  <Route element={<ProtectedRoute allowedRoles={['GUEST']} />}>
                    <Route path="dashboard/guest" element={<GuestDashboard />} />
                  </Route>

                  {/* Shared Routes — accessible to all authenticated roles */}
                  <Route path="documents"    element={<DocumentsPage />} />
                  <Route path="workflows"    element={<WorkflowsPage />} />
                  <Route path="settings"     element={<SettingsPage />} />
                  <Route path="unauthorized" element={<Unauthorized />} />

                  {/* Root redirect based on role */}
                  <Route path="" element={<RoleBasedRedirect />} />
                </Route>
              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <SettingsSyncer />
          </Suspense>
          <Toaster />
        </BrowserRouter>
      </Provider>
    </ThemeProvider>
  );
}

export default App;
