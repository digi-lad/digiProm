import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Lock } from 'lucide-react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import RankingCard from '../components/RankingCard';
import { Role, Candidate } from '../types';

export default function RankingsView() {
  const [activeRole, setActiveRole] = useState<Role>('KING');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [isBlindMode, setIsBlindMode] = useState(false);
  const [pollEndTime, setPollEndTime] = useState<number | null>(null);
  const [countdownString, setCountdownString] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const cands: Candidate[] = [];
      snapshot.forEach((doc) => {
        cands.push({ id: doc.id, ...doc.data() } as Candidate);
      });
      setCandidates(cands);
    });

    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      setTotalTickets(snapshot.size);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        setIsBlindMode(docSnap.data().isBlindMode ?? true);
        setPollEndTime(docSnap.data().pollEndTime ?? null);
      }
    });

    return () => {
      unsub();
      unsubTickets();
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

  const kings = candidates.filter(c => c.role === 'KING').sort((a, b) => b.votes - a.votes);
  const queens = candidates.filter(c => c.role === 'QUEEN').sort((a, b) => b.votes - a.votes);

  const activeCandidates = activeRole === 'KING' ? kings : queens;

  return (
    <main className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto">
      <div className="mb-10 text-center relative flex flex-col items-center">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10 opacity-60 pointer-events-none"></div>
        {countdownString ? (
          <div className="mb-2 inline-flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary mb-1">Dừng bình chọn sau</span>
            <div className="font-mono text-xl text-primary font-bold shadow-[0_0_15px_rgba(245,206,83,0.2)] rounded px-3 py-0.5 border border-primary/20 bg-surface-container/50">
              {countdownString}
            </div>
          </div>
        ) : (
          <p className="text-error text-[10px] uppercase tracking-[0.3em] font-bold mb-2">Đã đóng bình chọn</p>
        )}
        <h2 className="font-headline text-4xl text-on-surface leading-tight">Bảng Xếp Hạng</h2>
      </div>

      <div className="flex p-1 bg-surface-container-high/40 backdrop-blur-md rounded-full mb-12 border border-outline-variant/10 shadow-inner max-w-xs mx-auto">
        <button
          onClick={() => setActiveRole('KING')}
          className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 ${activeRole === 'KING' ? 'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-[0_0_20px_rgba(245,206,83,0.3)] scale-[1.02]' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          KING
        </button>
        <button
          onClick={() => setActiveRole('QUEEN')}
          className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 ${activeRole === 'QUEEN' ? 'bg-gradient-to-r from-primary to-secondary text-on-primary shadow-[0_0_20px_rgba(245,206,83,0.3)] scale-[1.02]' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          QUEEN
        </button>
      </div>

      {isBlindMode ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in mt-12 bg-surface-container/30 backdrop-blur-md rounded-3xl border border-secondary/20 shadow-xl">
          <Lock className="w-16 h-16 text-secondary mb-6 opacity-80 animate-pulse" />
          <h3 className="font-headline text-2xl text-secondary tracking-[0.2em] uppercase mb-4 shimmer-text px-4">
            Bảng Xếp Hạng Đang Được Đóng Băng
          </h3>
          <p className="text-on-surface-variant text-sm font-body tracking-wider leading-relaxed px-8">
            Những lá phiếu cuối cùng vẫn đang được ghi nhận. Kết quả chính thức sẽ sớm được công bố trên màn hình lớn!
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {activeCandidates.length > 0 && (
              <RankingCard 
                candidate={activeCandidates[0]} 
                isTopCard 
                rankNumber={1} 
                rankLabel={activeRole === 'KING' ? 'KING HIỆN TẠI' : 'QUEEN HIỆN TẠI'}
                totalTickets={totalTickets} 
              />
            )}
            
            {activeCandidates.length > 1 && (
              <RankingCard 
                candidate={activeCandidates[1]} 
                isTopCard 
                rankNumber={2} 
                rankLabel={activeRole === 'KING' ? 'PRINCE HIỆN TẠI' : 'PRINCESS HIỆN TẠI'}
                totalTickets={totalTickets} 
              />
            )}

            <section className="space-y-6 mt-6">
              <h4 className="text-[10px] font-bold tracking-[0.4em] text-on-surface-variant uppercase pl-2 mb-4">Các Ứng Viên Sáng Giá</h4>
              {activeCandidates.slice(2).map(candidate => (
                <RankingCard key={candidate.id} candidate={candidate} totalTickets={totalTickets} />
              ))}
              {activeCandidates.length === 0 && (
                <p className="text-on-surface-variant text-sm text-center py-8">Không có ứng cử viên nào.</p>
              )}
            </section>
          </motion.div>
        </AnimatePresence>
      )}

      <div className="py-12 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-4 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-outline-variant/30"></div>
          <Star className="text-primary/40 w-4 h-4" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-outline-variant/30"></div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-primary/60 font-bold uppercase tracking-[0.2em]">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          ĐANG CẬP NHẬT TRỰC TIẾP
        </div>
      </div>
    </main>
  );
}
