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
    setCurrentView(view);
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
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-primary relative overflow-hidden">
        <div className="absolute inset-0 stardust-bg opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px]"></div>
        
        <div className="relative flex flex-col items-center z-10">
          <h1 className="font-headline text-4xl font-bold text-primary italic mb-10 drop-shadow-[0_0_15px_rgba(245,206,83,0.5)]">digiProm</h1>
          
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border-t-[3px] border-primary animate-[spin_2s_linear_infinite] opacity-90 drop-shadow-[0_0_10px_rgba(245,206,83,0.5)]"></div>
            <div className="absolute inset-2 rounded-full border-r-[3px] border-secondary animate-[spin_3s_linear_infinite_reverse] opacity-70"></div>
            <div className="absolute inset-4 rounded-full border-b-[3px] border-on-surface animate-[spin_1.5s_linear_infinite] opacity-50"></div>
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-md animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h2 className="text-xl md:text-2xl font-headline tracking-[0.3em] uppercase shimmer-text mb-4 ml-2">Đang tải</h2>
          
          <div className="flex space-x-2">
            <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-16 h-16 text-error mb-4" />
        <h2 className="text-2xl font-headline text-error mb-2">Lỗi xác thực</h2>
        <p className="text-on-surface-variant max-w-md">{authError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 bg-primary text-on-primary rounded-full font-bold uppercase tracking-widest text-sm"
        >
          Thử lại
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
          Bảng điều khiển Admin
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
