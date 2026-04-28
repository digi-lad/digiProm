import { useState, useEffect } from 'react';
import { View } from './types';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import VotingView from './views/VotingView';
import RankingsView from './views/RankingsView';
import AdminDashboard from './views/AdminDashboard';
import LedLeaderboard from './views/LedLeaderboard';
import Gateway from './views/Gateway';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('GATEWAY');
  const { isAdmin, ticketCode, loading, authError } = useAuth();

  const handleViewChange = (view: View) => {
    if (view === 'VOTING' && !ticketCode && !isAdmin) {
      setCurrentView('GATEWAY');
    } else if (view === 'ADMIN' && !isAdmin) {
      setCurrentView('GATEWAY');
    } else {
      setCurrentView(view);
    }
  };

  // Expose navigation to window for the demo admin toggle
  (window as any).onViewChange = handleViewChange;

  // Enforce access control in case state changes while in a restricted view
  useEffect(() => {
    if (currentView === 'VOTING' && !ticketCode && !isAdmin) {
      setCurrentView('GATEWAY');
    }
    if (currentView === 'ADMIN' && !isAdmin) {
      setCurrentView('GATEWAY');
    }
  }, [currentView, ticketCode, isAdmin]);

  if (loading) {
    return <div className="min-h-screen bg-surface flex items-center justify-center text-primary">Loading...</div>;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-16 h-16 text-error mb-4" />
        <h2 className="text-2xl font-headline text-error mb-2">Authentication Error</h2>
        <p className="text-on-surface-variant max-w-md">{authError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 bg-primary text-on-primary rounded-full font-bold uppercase tracking-widest text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (currentView === 'GATEWAY') {
    return (
      <Gateway 
        onEnterVoting={() => handleViewChange('VOTING')}
        onEnterAdmin={() => handleViewChange('ADMIN')}
        onEnterRankings={() => handleViewChange('RANKINGS')}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {currentView !== 'ADMIN' && currentView !== 'LED_LEADERBOARD' && <Header />}
      
      {currentView === 'VOTING' && <VotingView onViewChange={handleViewChange} />}
      {currentView === 'RANKINGS' && <RankingsView />}
      {currentView === 'ADMIN' && isAdmin && <AdminDashboard />}
      {currentView === 'LED_LEADERBOARD' && <LedLeaderboard onViewChange={handleViewChange} />}

      {currentView !== 'ADMIN' && currentView !== 'LED_LEADERBOARD' && (
        <BottomNav currentView={currentView} onViewChange={handleViewChange} />
      )}
      
      {/* Admin toggle if on desktop and not in admin view */}
      {currentView !== 'ADMIN' && currentView !== 'LED_LEADERBOARD' && isAdmin && (
        <button 
          onClick={() => handleViewChange('ADMIN')}
          className="fixed top-4 right-20 z-[60] bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-all hidden md:block"
        >
          Admin Panel
        </button>
      )}

      {/* Back to App toggle from Admin or LED */}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
