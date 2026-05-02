import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stars, UserCircle, Eye, EyeOff, Lock, Sparkles, LogOut } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Candidate, View } from '../types';

interface LedRankRowProps {
  candidate: Candidate;
  rank: number;
  totalTickets: number;
  isBlind?: boolean;
  key?: string;
}

function LedRankRow({ candidate, rank, totalTickets, isBlind }: LedRankRowProps) {
  const percentage = totalTickets > 0 ? (candidate.votes / totalTickets) * 100 : 0;
  return (
    <div className={`relative bg-surface-container-high/40 backdrop-blur-md py-1.5 px-3 rounded-lg flex items-center gap-3 border-l-4 ${rank === 2 ? 'border-secondary/50' : 'border-transparent'} ${isBlind ? 'overflow-hidden' : ''}`}>
      {isBlind && (
        <div className="absolute inset-0 bg-surface/40 backdrop-blur-lg flex items-center justify-center z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-secondary animate-pulse" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-on-surface/50 font-bold">Counting...</span>
          </div>
        </div>
      )}
      <span className="font-headline text-lg text-on-surface-variant font-bold w-6 shrink-0">{rank}</span>
      <div className="flex flex-1 items-center gap-3 w-full">
        <div className="w-[30%] shrink-0">
          <span className={`font-body text-sm font-semibold text-on-surface truncate block ${isBlind ? 'opacity-20' : ''}`}>
            {isBlind ? 'Ẩn Danh' : candidate.name}
          </span>
        </div>
        <div className="w-[70%] flex items-center gap-3">
          <div className="h-2 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: isBlind ? '0%' : `${percentage}%` }}
              transition={{ duration: 1, delay: rank * 0.1 }}
              className="h-full bg-gradient-to-r from-outline-variant to-primary"
            ></motion.div>
          </div>
          <span className={`text-primary text-sm font-bold w-8 text-right shrink-0 ${isBlind ? 'opacity-20' : ''}`}>
            {isBlind ? '--' : candidate.votes.toLocaleString()}
          </span>
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
  const [totalTickets, setTotalTickets] = useState(0);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (revealCountdown === null) return;
    
    if (revealCountdown > 0) {
      const timer = setTimeout(() => setRevealCountdown(revealCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (revealCountdown === 0) {
      updateDoc(doc(db, 'settings', 'system'), {
        isBlindMode: false
      });
      setRevealCountdown(null);
    }
  }, [revealCountdown]);

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

    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      setTotalTickets(snapshot.size);
    });

    return () => {
      unsubCandidates();
      unsubSettings();
      unsubTickets();
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

  const getNameClass = (name: string, isTop1: boolean) => {
    const len = name.length;
    if (isTop1) {
      if (len > 24) return 'text-sm whitespace-nowrap';
      if (len > 18) return 'text-base whitespace-nowrap';
      if (len > 14) return 'text-xl whitespace-nowrap';
      return 'text-2xl whitespace-nowrap';
    } else {
      if (len > 24) return 'text-[10px] whitespace-nowrap';
      if (len > 18) return 'text-xs whitespace-nowrap';
      if (len > 14) return 'text-sm whitespace-nowrap';
      return 'text-xl whitespace-nowrap';
    }
  };

  const toggleBlindMode = () => {
    updateDoc(doc(db, 'settings', 'system'), {
      isBlindMode: !isBlindMode
    });
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body overflow-hidden stardust-bg">
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-12 py-6 bg-[#000e25]/80 backdrop-blur-xl border-b border-primary/5">
        <div className="flex items-center gap-4 w-1/3">
          <button 
            onClick={toggleBlindMode}
            className="p-2 text-on-surface-variant/30 hover:text-on-surface-variant/80 transition-colors opacity-50 hover:opacity-100"
            title="Toggle Blind Mode"
          >
            {isBlindMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Countdown Timer */}
        {isPollOpen ? (
          <div className="flex flex-col items-center w-1/3">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary mb-1">Dừng Bỏ Phiếu Sau</span>
            <div className="font-mono text-4xl text-primary font-bold shadow-[0_0_20px_rgba(245,206,83,0.2)] rounded-lg px-4 py-1 bg-surface-container/50 border border-primary/20">
              {countdownString || '00:00'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-1/3">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-error mb-1">Trạng Thái</span>
            <div className="font-headline text-2xl text-error font-bold tracking-widest bg-surface-container/50 border border-error/20 rounded-lg px-4 py-2">
              CLOSED
            </div>
          </div>
        )}

        <div className="w-1/3 flex justify-end">
          <button
            onClick={() => onViewChange('ADMIN')}
            className="p-2 text-on-surface-variant/30 hover:text-on-surface-variant/80 transition-colors opacity-50 hover:opacity-100"
            title="Thoát"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {revealCountdown !== null && revealCountdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <motion.span
              key={revealCountdown}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.5 }}
              className="text-[25rem] font-bold text-primary font-headline drop-shadow-[0_0_50px_rgba(245,206,83,0.8)]"
            >
              {revealCountdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`px-12 h-screen w-full flex flex-col transition-all duration-1000 ${isBlindMode ? 'justify-center items-center pt-24' : 'pt-40 pb-12'}`}>
        
        {isBlindMode && (
          <div className="flex flex-col items-center text-center w-full mb-24 scale-125 z-40">
            <h2 className="text-secondary font-bold text-3xl tracking-[0.2em] uppercase shimmer-text mb-2 drop-shadow-[0_0_15px_rgba(245,206,83,0.3)]">Bảng Xếp Hạng Đang Được Đóng Băng</h2>
            <p className="text-primary/80 text-sm font-body tracking-[0.3em] uppercase drop-shadow-md mb-6">Những lá phiếu cuối cùng vẫn đang được ghi nhận</p>
            <button 
              onClick={() => setRevealCountdown(5)}
              className="px-8 py-3 bg-secondary/10 border border-secondary/50 rounded-full text-secondary font-bold tracking-[0.3em] uppercase hover:bg-secondary/20 hover:scale-105 transition-all shadow-[0_0_15px_rgba(245,206,83,0.2)] active:scale-95 cursor-pointer"
            >
              BẮT ĐẦU ĐẾM NGƯỢC
            </button>
          </div>
        )}

        <div className={`w-full grid grid-cols-2 gap-16 transition-all duration-1000 ${isBlindMode ? 'scale-[1.15]' : ''}`}>
        {/* TOP KING SECTION */}
        <section className="flex flex-col">
          <div className="flex items-end justify-center h-[420px] pb-6 gap-8">
            {/* Top 2 King (Left) */}
            {kings[1] && (
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
                className="relative z-10 mb-4 group shrink-0"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-center w-full z-30 pointer-events-none">
                  <span className="font-headline text-2xl font-bold tracking-[0.3em] uppercase text-secondary drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] shimmer-text">Prince</span>
                </div>
                <div className="absolute -inset-2 bg-secondary/10 blur-xl rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>
                <div className="w-48 h-64 rounded-full overflow-hidden border-2 border-secondary/40 relative shadow-xl mt-2">
                  <img
                    src={kings[1].imageUrl || undefined}
                    alt="Top 2 King"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-70"></div>
                  {isBlindMode && (
                    <div className="absolute inset-0 bg-surface/90 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-4">
                      <EyeOff className="text-secondary w-8 h-8 mb-2 opacity-80" />
                      <h4 className="font-headline text-lg font-bold text-white tracking-widest uppercase shimmer-text">ĐÃ ẨN</h4>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-56 text-center z-30">
                  <div className="bg-surface-container-high/90 backdrop-blur-md py-1.5 px-4 rounded-full border border-secondary/30 shadow-xl relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-surface-variant text-on-surface-variant border border-outline-variant/30 text-[10px] font-bold px-2 py-0.5 rounded shadow">#2</div>
                    <h3 className={`font-headline font-bold px-2 ${getNameClass(kings[1].name || '', false)} ${isBlindMode ? 'text-on-surface-variant/40 italic' : 'text-on-surface'}`}>
                      {isBlindMode ? '...' : (kings[1].name || '---')}
                    </h3>
                    {!isBlindMode && kings[1].title && (
                      <p className="text-secondary/80 text-[10px] uppercase tracking-widest font-body mt-0.5">{kings[1].title}</p>
                    )}
                    {!isBlindMode && (
                      <div className="text-on-surface-variant font-body text-sm font-bold mt-0.5">
                        {kings[1].votes.toLocaleString()} <span className="text-[8px] font-normal">BÌNH CHỌN</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Top 1 King (Right) */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative z-20 group shrink-0"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-center w-full z-30 pointer-events-none">
                <span className="font-headline text-4xl font-bold tracking-[0.4em] uppercase text-primary drop-shadow-[0_0_15px_rgba(245,206,83,0.5)] shimmer-text">King</span>
              </div>
              <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse pointer-events-none"></div>
              <div className="w-64 h-80 rounded-full overflow-hidden border-4 border-primary/40 nebula-glow relative shadow-[0_0_50px_rgba(245,206,83,0.15)] bg-surface mt-2">
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
                    <h4 className="font-headline text-3xl font-bold text-white tracking-widest uppercase shimmer-text">ĐÃ ẨN</h4>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-72 text-center z-30">
                <div className="bg-surface-container-highest/90 backdrop-blur-md py-2 px-6 rounded-full border border-primary/30 shadow-2xl relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded shadow-[0_0_10px_rgba(245,206,83,0.5)]">#1</div>
                  <h3 className={`font-headline font-bold px-2 ${getNameClass(topKing?.name || '', true)} ${isBlindMode ? 'text-on-surface-variant/40 italic' : 'text-white'}`}>
                    {isBlindMode ? '...' : (topKing?.name || '---')}
                  </h3>
                  {!isBlindMode && topKing?.title && (
                    <p className="text-primary/80 text-xs uppercase tracking-widest font-body mt-0.5">{topKing.title}</p>
                  )}
                  {!isBlindMode && topKing && (
                    <div className="text-secondary font-body text-2xl font-extrabold tracking-tighter mt-1">
                      {topKing.votes.toLocaleString()} <span className="text-[10px] font-normal opacity-70">BÌNH CHỌN</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {!isBlindMode && (
            <div className="flex flex-col space-y-2 mt-4 px-8">
              {kings.slice(2, 10).map((candidate, idx) => (
                <LedRankRow
                  key={candidate.id}
                  candidate={candidate}
                  rank={idx + 3}
                  totalTickets={totalTickets}
                  isBlind={isBlindMode && idx === 1}
                />
              ))}
            </div>
          )}
        </section>

        {/* TOP QUEEN SECTION */}
        <section className="flex flex-col">
          <div className="flex items-end justify-center h-[420px] pb-6 gap-8">
            {/* Top 1 Queen (Left) */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
              className="relative z-20 group shrink-0"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-center w-full z-30 pointer-events-none">
                <span className="font-headline text-4xl font-bold tracking-[0.4em] uppercase text-primary drop-shadow-[0_0_15px_rgba(245,206,83,0.5)] shimmer-text">Queen</span>
              </div>
              <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-64 h-80 rounded-full overflow-hidden border-4 border-primary/40 nebula-glow relative shadow-[0_0_50px_rgba(245,206,83,0.15)] bg-surface mt-2">
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
                    <EyeOff className="text-primary w-16 h-16 mb-6 opacity-80" />
                    <h4 className="font-headline text-3xl font-bold text-white tracking-widest uppercase shimmer-text">ĐÃ ẨN</h4>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-72 text-center z-30">
                <div className="bg-surface-container-highest/90 backdrop-blur-md py-2 px-6 rounded-full border border-primary/30 shadow-2xl relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded shadow-[0_0_10px_rgba(245,206,83,0.5)]">#1</div>
                  <h3 className={`font-headline font-bold px-2 ${getNameClass(topQueen?.name || '', true)} ${isBlindMode ? 'text-on-surface-variant/40 italic' : 'text-white'}`}>
                    {isBlindMode ? '...' : (topQueen?.name || '---')}
                  </h3>
                  {!isBlindMode && topQueen?.title && (
                    <p className="text-primary/80 text-xs uppercase tracking-widest font-body mt-0.5">{topQueen.title}</p>
                  )}
                  {!isBlindMode && topQueen && (
                    <div className="text-secondary font-body text-2xl font-extrabold tracking-tighter mt-1">
                      {topQueen.votes.toLocaleString()} <span className="text-[10px] font-normal opacity-70">BÌNH CHỌN</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Top 2 Queen (Right) */}
            {queens[1] && (
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1.5 }}
                className="relative z-10 mb-4 group shrink-0"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-center w-full z-30 pointer-events-none">
                  <span className="font-headline text-2xl font-bold tracking-[0.3em] uppercase text-secondary drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] shimmer-text">Princess</span>
                </div>
                <div className="absolute -inset-2 bg-secondary/10 blur-xl rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}></div>
                <div className="w-48 h-64 rounded-full overflow-hidden border-2 border-secondary/40 relative shadow-xl mt-2">
                  <img
                    src={queens[1].imageUrl || undefined}
                    alt="Top 2 Queen"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-70"></div>
                  {isBlindMode && (
                    <div className="absolute inset-0 bg-surface/90 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-4">
                      <EyeOff className="text-secondary w-8 h-8 mb-2 opacity-80" />
                      <h4 className="font-headline text-lg font-bold text-white tracking-widest uppercase shimmer-text">ĐÃ ẨN</h4>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-56 text-center z-30">
                  <div className="bg-surface-container-high/90 backdrop-blur-md py-1.5 px-4 rounded-full border border-secondary/30 shadow-xl relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-surface-variant text-on-surface-variant border border-outline-variant/30 text-[10px] font-bold px-2 py-0.5 rounded shadow">#2</div>
                    <h3 className={`font-headline font-bold px-2 ${getNameClass(queens[1].name || '', false)} ${isBlindMode ? 'text-on-surface-variant/40 italic' : 'text-on-surface'}`}>
                      {isBlindMode ? '...' : (queens[1].name || '---')}
                    </h3>
                    {!isBlindMode && queens[1].title && (
                      <p className="text-secondary/80 text-[10px] uppercase tracking-widest font-body mt-0.5">{queens[1].title}</p>
                    )}
                    {!isBlindMode && (
                      <div className="text-on-surface-variant font-body text-sm font-bold mt-0.5">
                        {queens[1].votes.toLocaleString()} <span className="text-[8px] font-normal">BÌNH CHỌN</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {!isBlindMode && (
            <div className="flex flex-col space-y-2 mt-4 px-8">
              {queens.slice(2, 10).map((candidate, idx) => (
                <LedRankRow
                  key={candidate.id}
                  candidate={candidate}
                  rank={idx + 3}
                  totalTickets={totalTickets}
                />
              ))}
            </div>
          )}
        </section>
        </div>
      </main>

      {/* Decorative Footer */}
      <footer className="fixed bottom-0 w-full p-8 flex flex-col items-center justify-center pointer-events-none gap-3 z-50">
        <div className="h-px w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="flex items-baseline gap-2 opacity-80">
          <span className="font-headline font-bold text-xl text-primary italic tracking-tight">digiProm</span>
          <span className="text-on-surface-variant/60 text-xs uppercase tracking-[0.3em] font-bold">- Trường THPT chuyên Lê Quý Đôn</span>
        </div>
      </footer>
    </div>
  );
}
