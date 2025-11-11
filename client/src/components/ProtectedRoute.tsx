import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Check if user account is active
  if (user && !user.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="max-w-md p-8 bg-slate-800 rounded-lg border border-slate-700 text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-400">Account Deactivated</h2>
          <p className="text-slate-300">
            Your account has been deactivated. Please contact your administrator for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="max-w-md p-8 bg-slate-800 rounded-lg border border-slate-700 text-center space-y-4">
          <h2 className="text-2xl font-bold text-yellow-400">Access Denied</h2>
          <p className="text-slate-300">
            You do not have permission to access this page. Admin privileges are required.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
