import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Stars, ArrowRight, BarChart2, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface GatewayProps {
  onEnterVoting: () => void;
  onEnterAdmin: () => void;
  onEnterRankings: () => void;
}

export default function Gateway({ onEnterVoting, onEnterAdmin, onEnterRankings }: GatewayProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { loginAsAdmin, loginWithTicket, isAdmin, ticketCode, clearSession } = useAuth();

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError('');
    setIsProcessing(true);

    const upperCode = code.trim().toUpperCase();

    if (upperCode === 'ADMIN2026') {
      const success = await loginAsAdmin(upperCode);
      if (success) {
        onEnterAdmin();
      } else {
        setError('Admin login failed.');
      }
    } else {
      const success = await loginWithTicket(upperCode);
      if (success) {
        onEnterVoting();
      } else {
        setError('Invalid or already used ticket code.');
      }
    }

    setIsProcessing(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden stardust-bg">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] nebula-glow -z-10 opacity-50"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center"
      >
        <div className="mb-12 text-center">
          <Stars className="w-16 h-16 text-primary mx-auto mb-6 drop-shadow-[0_0_15px_#ffbf00]" />
          <h1 className="font-headline text-5xl font-bold text-primary italic mb-2">digiProm</h1>
          <p className="text-on-surface-variant font-body tracking-[0.2em] text-sm uppercase">Trường THPT chuyên Lê Quý Đôn</p>
        </div>

        <form onSubmit={handleEnter} className="w-full space-y-6">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Access Code"
              className="w-full bg-surface-container-high/50 border border-outline-variant/30 rounded-2xl px-6 py-5 text-center text-xl font-headline tracking-widest text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all uppercase"
              disabled={isProcessing}
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-8 left-0 w-full flex items-center justify-center gap-2 text-error text-sm font-semibold"
              >
                <ShieldAlert className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={!code.trim() || isProcessing}
            className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary p-[1px] group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <div className="bg-surface-container-highest px-8 py-4 rounded-[15px] flex items-center justify-center gap-3 transition-colors group-hover:bg-surface-container-highest/80">
              <span className="font-headline font-bold text-lg text-primary tracking-wider uppercase">
                {isProcessing ? 'Verifying...' : 'Enter'}
              </span>
              {!isProcessing && <ArrowRight className="w-5 h-5 text-primary" />}
            </div>
          </button>
        </form>

        <div className="mt-12 w-full flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 w-full">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-outline-variant/30"></div>
            <span className="text-on-surface-variant/50 text-xs font-bold uppercase tracking-widest">HOẶC</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-outline-variant/30"></div>
          </div>

          {isAdmin ? (
            <button
              onClick={onEnterAdmin}
              className="flex items-center gap-2 text-primary hover:text-secondary transition-colors font-bold uppercase tracking-widest"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-sm">Return to Admin Dashboard</span>
            </button>
          ) : (
            <button
              onClick={onEnterRankings}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-wider uppercase">Xem Xếp Hạng Trực Tiếp</span>
            </button>
          )}

          {(ticketCode || isAdmin) && (
            <button
              onClick={() => {
                clearSession();
                setCode('');
              }}
              className="mt-4 flex items-center gap-2 text-error/80 hover:text-error transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wider uppercase">{isAdmin ? 'Sign Out Admin' : 'Change Ticket Code'}</span>
            </button>
          )}
        </div>
      </motion.div>
    </main>
  );
}
