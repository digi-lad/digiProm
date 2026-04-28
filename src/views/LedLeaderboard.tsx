import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Stars, UserCircle, EyeOff, Lock, Sparkles, LogOut } from 'lucide-react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Candidate, View } from '../types';

interface LedRankRowProps {
  candidate: Candidate;
  rank: number;
  isBlind?: boolean;
  key?: string;
}

function LedRankRow({ candidate, rank, isBlind }: LedRankRowProps) {
  return (
    <div className={`relative bg-surface-container-high/40 backdrop-blur-md p-4 rounded-xl flex items-center gap-6 border-l-4 ${rank === 2 ? 'border-secondary/50' : 'border-transparent'} ${isBlind ? 'overflow-hidden' : ''}`}>
      {isBlind && (
        <div className="absolute inset-0 bg-surface/40 backdrop-blur-lg flex items-center justify-center z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-secondary animate-pulse" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-on-surface/50 font-bold">Counting...</span>
          </div>
        </div>
      )}
      <span className="font-headline text-2xl text-on-surface-variant font-bold w-6">{rank}</span>
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <span className={`font-body font-semibold text-on-surface ${isBlind ? 'opacity-20' : ''}`}>
            {isBlind ? 'Sebastian Night' : candidate.name}
          </span>
          <span className={`text-primary font-bold ${isBlind ? 'opacity-20' : ''}`}>
            {isBlind ? '--' : candidate.votes.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: isBlind ? '0%' : `${100 - rank * 8}%` }}
            transition={{ duration: 1, delay: rank * 0.1 }}
            className="h-full bg-gradient-to-r from-outline-variant to-primary"
          ></motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LedLeaderboard({ onViewChange }: { onViewChange: (view: View) => void }) {
  const [isBlindMode, setIsBlindMode] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pollEndTime, setPollEndTime] = useState<number | null>(null);
  const [countdownString, setCountdownString] = useState('');

  useEffect(() => {
    const unsubCandidates = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const cands: Candidate[] = [];
      snapshot.forEach((doc) => {
        cands.push({ id: doc.id, ...doc.data() } as Candidate);
      });
      setCandidates(cands);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        setIsBlindMode(docSnap.data().isBlindMode ?? true);
        setPollEndTime(docSnap.data().pollEndTime ?? null);
      }
    });

    return () => {
      unsubCandidates();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pollEndTime && pollEndTime > Date.now()) {
      interval = setInterval(() => {
        const remaining = pollEndTime - Date.now();
        if (remaining <= 0) {
          setCountdownString('00:00');
          setPollEndTime(null);
        } else {
          const m = Math.floor(remaining / 60000).toString().padStart(2, '0');
          const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
          setCountdownString(`${m}:${s}`);
        }
      }, 1000);
    } else {
      setCountdownString('');
    }
    return () => clearInterval(interval);
  }, [pollEndTime]);

  const isPollOpen = pollEndTime !== null && pollEndTime > Date.now();

  const kings = candidates.filter(c => c.role === 'KING').sort((a, b) => b.votes - a.votes);
  const queens = candidates.filter(c => c.role === 'QUEEN').sort((a, b) => b.votes - a.votes);

  const topKing = kings[0];
  const topQueen = queens[0];

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body overflow-hidden stardust-bg">
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-12 py-6 bg-[#000e25]/80 backdrop-blur-xl border-b border-primary/5">
        <div className="flex items-center gap-4">

        </div>

        {/* Countdown Timer */}
        {isPollOpen ? (
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary mb-1">Dừng Bỏ Phiếu Sau</span>
            <div className="font-mono text-4xl text-primary font-bold shadow-[0_0_20px_rgba(245,206,83,0.2)] rounded-lg px-4 py-1 bg-surface-container/50 border border-primary/20">
              {countdownString || '00:00'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-error mb-1">Trạng Thái</span>
            <div className="font-headline text-2xl text-error font-bold tracking-widest bg-surface-container/50 border border-error/20 rounded-lg px-4 py-2">
              CLOSED
            </div>
          </div>
        )}

        <button
          onClick={() => onViewChange('ADMIN')}
          className="text-primary hover:text-secondary transition-colors p-2"
        >
          <LogOut className="w-8 h-8" />
        </button>
      </header>

      <main className="pt-32 pb-12 px-12 h-screen grid grid-cols-2 gap-16">
        {/* TOP KING SECTION */}
        <section className="flex flex-col space-y-12">
          <div className="flex flex-col items-center text-center">

            <div className="relative group">
              <div className="w-72 h-96 rounded-full overflow-hidden border-4 border-primary/30 nebula-glow relative">
                {topKing && (
                  <img
                    src={topKing.imageUrl || undefined}
                    alt="Top King"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-60"></div>

                {isBlindMode && (
                  <div className="absolute inset-0 bg-surface/90 backdrop-blur-xl z-20 flex flex-col items-center justify-center text-center p-8">
                    <EyeOff className="text-primary w-16 h-16 mb-6 opacity-80" />
                    <h4 className="font-headline text-3xl font-bold text-white tracking-widest uppercase mb-2 shimmer-text">The Oracle is Silent</h4>
                    <p className="font-body text-xs text-primary/60 tracking-[0.3em] uppercase">Fate is sealed until the dawn</p>
                  </div>
                )}
              </div>

              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full text-center">
                <div className="bg-surface-container-highest/80 backdrop-blur-md py-2 px-8 rounded-full border border-primary/20 shadow-2xl">
                  <h3 className={`font-headline text-3xl font-bold ${isBlindMode ? 'text-on-surface-variant/40 italic' : 'text-white'}`}>
                    {isBlindMode ? 'Identity Veiled' : (topKing?.name || '---')}
                  </h3>
                  {!isBlindMode && topKing && (
                    <div className="text-secondary font-body text-2xl font-extrabold tracking-tighter mt-1">
                      {topKing.votes.toLocaleString()} <span className="text-xs font-normal opacity-70">VOTES</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4 mt-12 px-8">
            {kings.slice(1, 4).map((candidate, idx) => (
              <LedRankRow
                key={candidate.id}
                candidate={candidate}
                rank={idx + 2}
                isBlind={isBlindMode && idx === 2}
              />
            ))}
          </div>
        </section>

        {/* TOP QUEEN SECTION */}
        <section className="flex flex-col space-y-12">
          <div className="flex flex-col items-center text-center">

            <div className="relative group">
              <div className="w-72 h-96 rounded-full overflow-hidden border-4 border-primary/30 nebula-glow relative">
                {topQueen && (
                  <img
                    src={topQueen.imageUrl || undefined}
                    alt="Top Queen"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-60"></div>

                {isBlindMode && (
                  <div className="absolute inset-0 bg-surface/90 backdrop-blur-xl z-20 flex flex-col items-center justify-center text-center p-8">
                    <Lock className="text-primary w-16 h-16 mb-6 opacity-80" />
                    <h4 className="font-headline text-3xl font-bold text-white tracking-widest uppercase mb-2 shimmer-text">LOCKED</h4>
                    <p className="font-body text-xs text-primary/60 tracking-[0.3em] uppercase">The stars guard her name</p>
                  </div>
                )}
              </div>

              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full text-center">
                <div className="bg-surface-container-highest/80 backdrop-blur-md py-2 px-8 rounded-full border border-primary/20 shadow-2xl">
                  <h3 className={`font-headline text-3xl font-bold ${isBlindMode ? 'text-on-surface-variant/40 italic' : 'text-white'}`}>
                    {isBlindMode ? 'Vision Clouded' : (topQueen?.name || '---')}
                  </h3>
                  {!isBlindMode && topQueen && (
                    <div className="text-secondary font-body text-2xl font-extrabold tracking-tighter mt-1">
                      {topQueen.votes.toLocaleString()} <span className="text-xs font-normal opacity-70">VOTES</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4 mt-12 px-8">
            {queens.slice(1, 4).map((candidate, idx) => (
              <LedRankRow
                key={candidate.id}
                candidate={candidate}
                rank={idx + 2}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Decorative Footer */}
      <footer className="fixed bottom-0 w-full p-8 flex justify-center pointer-events-none">
        <div className="h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      </footer>
    </div>
  );
}
