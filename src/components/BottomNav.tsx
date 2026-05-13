import { Crown, BarChart3, Home } from 'lucide-react';
import { View } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const { isAdmin, ticketCode } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#000e25]/90 backdrop-blur-2xl z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10">
      {(!ticketCode && !isAdmin) && (
        <button 
          onClick={() => onViewChange('GATEWAY')}
          className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all ${currentView === 'GATEWAY' ? 'bg-primary/10 text-primary' : 'text-on-surface/40'}`}
        >
          <Home className="w-6 h-6" />
          <span className="font-body text-[10px] uppercase tracking-widest mt-1">Trang chủ</span>
        </button>
      )}

      {(ticketCode || isAdmin) && (
        <button 
          onClick={() => onViewChange('VOTING')}
          className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all ${currentView === 'VOTING' ? 'bg-primary/10 text-primary' : 'text-on-surface/40'}`}
        >
          <Crown className="w-6 h-6" />
          <span className="font-body text-[10px] uppercase tracking-widest mt-1">Bình chọn</span>
        </button>
      )}
      
    </nav>
  );
}
