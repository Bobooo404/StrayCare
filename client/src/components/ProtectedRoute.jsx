import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from './ui.jsx';

/**
 * Guards a route by role.
 *
 * @param {{ role: 'user'|'ngo', children: React.ReactNode }} props
 */
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, role: currentRole, checking } = useAuth();
  const location = useLocation();

  // Wait for the session restore call, otherwise a refresh on a protected
  // page would bounce the user to the login screen.
  if (checking) return <PageLoader label="Restoring your session" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Signed in, but with the wrong account type: send them to their own home
  // rather than showing a page that would fail every request.
  if (role && currentRole !== role) {
    return <Navigate to={currentRole === 'ngo' ? '/ngo/dashboard' : '/dashboard'} replace />;
  }

  return children;
}
