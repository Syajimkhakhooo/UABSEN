import { Navigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { loading, profile } = useAuth();

  if (loading) {
    return <LoadingScreen label="Memverifikasi akses..." />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.role) {
    return <Navigate to="/pending-access" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' || profile.role === 'sensei' ? '/admin' : '/student'} replace />;
  }

  if (!profile.active) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
