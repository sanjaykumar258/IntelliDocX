import { Suspense, lazy } from 'react';
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

// Lazy load components
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const ManagerDashboard = lazy(() => import('@/pages/ManagerDashboard').then(module => ({ default: module.ManagerDashboard })));
const EmployeeDashboard = lazy(() => import('@/pages/EmployeeDashboard').then(module => ({ default: module.EmployeeDashboard })));
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage').then(module => ({ default: module.DocumentsPage })));
const WorkflowsPage = lazy(() => import('@/pages/WorkflowsPage').then(module => ({ default: module.WorkflowsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage').then(module => ({ default: module.AuditLogPage })));
const GuestDashboard = lazy(() => import('@/pages/GuestDashboard').then(module => ({ default: module.GuestDashboard })));
const ITDashboard = lazy(() => import('@/pages/ITDashboard').then(module => ({ default: module.ITDashboard })));
const HRDashboard = lazy(() => import('@/pages/HRDashboard').then(module => ({ default: module.HRDashboard })));

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing IntelliDocX...</p>
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

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardLayout />}>

                {/* Admin Routes (Super Admin + Admin) */}
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
                  <Route path="dashboard/admin" element={<AdminDashboard />} />
                  <Route path="audit-logs" element={<AuditLogPage />} />
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
                </Route>

                {/* Guest Routes */}
                <Route element={<ProtectedRoute allowedRoles={['GUEST']} />}>
                  <Route path="dashboard/guest" element={<GuestDashboard />} />
                </Route>

                {/* Shared Routes (all roles) */}
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="workflows" element={<WorkflowsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="unauthorized" element={<Unauthorized />} />

                {/* Default Redirect */}
                <Route path="" element={<RoleBasedRedirect />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
