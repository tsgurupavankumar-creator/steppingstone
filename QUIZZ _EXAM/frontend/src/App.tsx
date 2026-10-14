import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ParticipantLoginPage } from './pages/ParticipantLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ParticipantDashboard } from './pages/participant/ParticipantDashboard';
import { Loader2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'participant' | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-sm font-semibold tracking-wide">Initializing Secure Examination Platform...</span>
        </div>
      </div>
    );
  }

  // If user is authenticated, route directly by role
  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <AdminDashboard />;
    }
    return <ParticipantDashboard />;
  }

  // Not authenticated: Route between landing page and dedicated login pages
  if (selectedRole === 'admin') {
    return (
      <AdminLoginPage
        onBack={() => setSelectedRole(null)}
        onSuccess={() => setSelectedRole(null)}
      />
    );
  }

  if (selectedRole === 'participant') {
    return (
      <ParticipantLoginPage
        onBack={() => setSelectedRole(null)}
        onSuccess={() => setSelectedRole(null)}
      />
    );
  }

  return <LandingPage onSelectRole={(role) => setSelectedRole(role)} />;
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
