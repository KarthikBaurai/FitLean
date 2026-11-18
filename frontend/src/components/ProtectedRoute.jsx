import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './PageStates';

// Wraps pages that need a login (and optionally the admin role).
// Note: this only hides pages in the browser. The real protection is on
// the server: every protected API route checks the token itself.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loading />;
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
