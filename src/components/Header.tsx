import { Stars, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { isAdmin, ticketCode, clearSession } = useAuth();

  const handleSignOut = () => {
    clearSession();
    if ((window as any).onViewChange) {
      (window as any).onViewChange('GATEWAY');
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#000e25]/80 backdrop-blur-xl flex items-center justify-between px-6 py-4 shadow-[0_0_48px_rgba(245,206,83,0.04)]">
      <div className="flex items-center gap-3">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-primary italic">digiProm</h1>
      </div>
      {(isAdmin || ticketCode) && (
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-error/80 hover:text-error transition-colors scale-95 active:scale-90"
          title="Reset Session"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Đăng Xuất</span>
        </button>
      )}
    </header>
  );
}
