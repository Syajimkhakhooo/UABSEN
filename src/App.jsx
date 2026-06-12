import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoadingScreen from './components/LoadingScreen';
import SetupRequiredScreen from './components/SetupRequiredScreen';
import ProtectedRoute from './routes/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { ROLE } from './lib/constants';
import { hasSupabaseEnv } from './lib/supabase';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const PendingAccessPage = lazy(() => import('./pages/auth/PendingAccessPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const StudentManagementPage = lazy(() => import('./pages/admin/StudentManagementPage'));
const ClassesManagementPage = lazy(() => import('./pages/admin/ClassesManagementPage'));
const AttendanceDataPage = lazy(() => import('./pages/admin/AttendanceDataPage'));
const LeaveRequestsPage = lazy(() => import('./pages/admin/LeaveRequestsPage'));
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const StaffManagementPage = lazy(() => import('./pages/admin/StaffManagementPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage'));
const AttendanceHistoryPage = lazy(() => import('./pages/student/AttendanceHistoryPage'));
const LeaveRequestPage = lazy(() => import('./pages/student/LeaveRequestPage'));
const StudentNotificationsPage = lazy(() => import('./pages/student/StudentNotificationsPage'));
const ProfilePage = lazy(() => import('./pages/student/ProfilePage'));

function RootRedirect() {
  const { profile } = useAuth();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.role) {
    return <Navigate to="/pending-access" replace />;
  }

  return profile.role === ROLE.ADMIN || profile.role === ROLE.SENSEI ? (
    <Navigate to={profile.role === ROLE.SENSEI ? '/admin/students' : '/admin'} replace />
  ) : (
    <Navigate to="/student" replace />
  );
}

export default function App() {
  const { loading } = useAuth();

  if (!hasSupabaseEnv) {
    return <SetupRequiredScreen />;
  }

  if (loading) {
    return <LoadingScreen label="Memuat sesi aplikasi..." />;
  }

  return (
    <Suspense fallback={<LoadingScreen label="Memuat halaman..." />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pending-access" element={<PendingAccessPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN, ROLE.SENSEI]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="students" element={<StudentManagementPage />} />
          <Route path="classes" element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <ClassesManagementPage />
            </ProtectedRoute>
          } />
          <Route path="attendance" element={<AttendanceDataPage />} />
          <Route path="leave-requests" element={<LeaveRequestsPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="audit-logs" element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <AuditLogPage />
            </ProtectedRoute>
          } />
          <Route path="reports" element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <ReportsPage />
            </ProtectedRoute>
          } />
          <Route path="staff" element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <StaffManagementPage />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={[ROLE.STUDENT]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboardPage />} />
          <Route path="history" element={<AttendanceHistoryPage />} />
          <Route path="leave-request" element={<LeaveRequestPage />} />
          <Route path="notifications" element={<StudentNotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
