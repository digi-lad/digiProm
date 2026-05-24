import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Vote, CheckCircle2 } from 'lucide-react';
import { collection, onSnapshot, doc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import CandidateCard from '../components/CandidateCard';
import { Role, Candidate, View } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface VotingViewProps {
  onViewChange: (view: View) => void;
}

export default function VotingView({ onViewChange }: VotingViewProps) {
  const [activeRole, setActiveRole] = useState<Role>('KING');
  const [selectedKings, setSelectedKings] = useState<string[]>([]);
  const [selectedQueens, setSelectedQueens] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollEndTime, setPollEndTime] = useState<number | null>(null);
  const [countdownString, setCountdownString] = useState('');
  const [maxVotesForKing, setMaxVotesForKing] = useState(3);
  const [maxVotesForQueen, setMaxVotesForQueen] = useState(3);
  const { ticketCode, clearSession } = useAuth();

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
        const data = docSnap.data();
        setPollEndTime(data.pollEndTime ?? null);
        
        if (data.maxVotesForKing !== undefined) setMaxVotesForKing(data.maxVotesForKing);
        else if (data.maxVotesPerRole !== undefined) setMaxVotesForKing(data.maxVotesPerRole); // fallback
        
        if (data.maxVotesForQueen !== undefined) setMaxVotesForQueen(data.maxVotesForQueen);
        else if (data.maxVotesPerRole !== undefined) setMaxVotesForQueen(data.maxVotesPerRole); // fallback
      }
    });

    return () => {
      unsubCandidates();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (!ticketCode) return;

    const unsubTicket = onSnapshot(doc(db, 'tickets', ticketCode), (docSnap) => {
      if (docSnap.exists() && docSnap.data().status === 'USED') {
        setHasVoted(true);
        const data = docSnap.data();
        if (data.votedForKings) setSelectedKings(data.votedForKings);
        if (data.votedForQueens) setSelectedQueens(data.votedForQueens);
      }
    });

    return () => unsubTicket();
  }, [ticketCode]);

  const kings = candidates.filter(c => c.role === 'KING');
  const queens = candidates.filter(c => c.role === 'QUEEN');

  const activeCandidates = activeRole === 'KING' ? kings : queens;
  const selectedIds = activeRole === 'KING' ? selectedKings : selectedQueens;

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

  const handleSelect = (id: string) => {
    if (hasVoted || !isPollOpen) return;

    if (activeRole === 'KING') {
      setSelectedKings(prev => {
        if (prev.includes(id)) return prev.filter(k => k !== id);
        if (prev.length >= maxVotesForKing) return prev;
        return [...prev, id];
      });
    } else {
      setSelectedQueens(prev => {
        if (prev.includes(id)) return prev.filter(q => q !== id);
        if (prev.length >= maxVotesForQueen) return prev;
        return [...prev, id];
      });
    }
  };

  const handleVote = async () => {
    if (!isPollOpen) {
      alert("Bình chọn hiện đang đóng.");
      return;
    }

    if (selectedKings.length !== maxVotesForKing || selectedQueens.length !== maxVotesForQueen) {
      alert(`Vui lòng chọn chính xác ${maxVotesForKing} King và ${maxVotesForQueen} Queen.`);
      return;
    }

    if (!ticketCode) {
      alert("Không tìm thấy vé hợp lệ. Vui lòng quay lại cổng.");
      onViewChange('GATEWAY');
      return;
    }

    setIsVoting(true);
    try {
      const ticketRef = doc(db, 'tickets', ticketCode);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        alert("Mã vé không hợp lệ.");
        clearSession();
        onViewChange('GATEWAY');
        return;
      }

      const ticketData = ticketSnap.data();
      if (ticketData.status === 'USED') {
        alert("Vé này đã được sử dụng.");
        setHasVoted(true);
        setIsVoting(false);
        return;
      }

      const batch = writeBatch(db);

      // Mark ticket as used
      batch.update(ticketRef, {
        status: 'USED',
        usedBy: auth.currentUser?.uid || 'anonymous',
        votedForKings: selectedKings,
        votedForQueens: selectedQueens
      });

      // Increment votes
      selectedKings.forEach(id => {
        batch.update(doc(db, 'candidates', id), {
          votes: increment(1)
        });
      });
      selectedQueens.forEach(id => {
        batch.update(doc(db, 'candidates', id), {
          votes: increment(1)
        });
      });

      await batch.commit();
      // The onSnapshot listener will automatically set hasVoted to true
      setIsVoting(false);
    } catch (error) {
      console.error("Error casting vote:", error);
      alert("Có lỗi xảy ra trong quá trình bình chọn.");
      setIsVoting(false);
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-32 px-6 stardust-bg">
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="font-headline text-4xl font-bold text-tertiary shimmer-text mb-4 drop-shadow-[0_0_15px_rgba(245,206,83,0.3)]">Cổng Bình Chọn</h2>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
            Mã Vé: <span className="text-on-surface">{ticketCode}</span>
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest bg-secondary/10 px-4 py-2 rounded-full border border-secondary/20 text-secondary">
            {activeRole === 'KING' ? `King Đã Chọn: ${selectedKings.length}/${maxVotesForKing}` : `Queen Đã Chọn: ${selectedQueens.length}/${maxVotesForQueen}`}
          </p>
        </div>
        
        {isPollOpen ? (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex flex-col items-center min-w-[180px] shadow-[0_0_25px_rgba(245,206,83,0.15)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
            <span className="relative z-10 text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Thời Gian Còn Lại</span>
            <span className="relative z-10 font-mono text-3xl text-primary font-bold tracking-wider">{countdownString || '00:00'}</span>
          </div>
        ) : (
          <div className="bg-error/20 border border-error/50 rounded-2xl p-4 text-center min-w-[180px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-error/10 to-transparent"></div>
            <p className="relative z-10 text-error font-bold uppercase tracking-widest text-sm">Bình Chọn Đã Đóng</p>
            <p className="relative z-10 text-[10px] text-error/80 mt-1 uppercase tracking-widest">Vui lòng đợi admin mở lại</p>
          </div>
        )}
      </div>

      <div className="flex justify-center mb-10 w-full">
        <div className="relative flex bg-surface-container/50 backdrop-blur-md rounded-2xl p-1.5 w-full max-w-sm border border-outline-variant/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-primary to-primary-container rounded-xl transition-all duration-500 ease-out shadow-[0_0_20px_rgba(245,206,83,0.3)]"
            style={{ 
              left: activeRole === 'KING' ? '6px' : 'calc(50%)',
            }}
          />
          <button
            onClick={() => setActiveRole('KING')}
            className={`relative flex-1 py-3 px-6 rounded-xl transition-colors duration-300 z-10 ${activeRole === 'KING' ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="font-headline font-bold uppercase tracking-widest text-sm">King</span>
          </button>
          <button
            onClick={() => setActiveRole('QUEEN')}
            className={`relative flex-1 py-3 px-6 rounded-xl transition-colors duration-300 z-10 ${activeRole === 'QUEEN' ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <span className="font-headline font-bold uppercase tracking-widest text-sm">Queen</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 gap-12"
          >
            {activeCandidates.map(candidate => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                isSelected={selectedIds.includes(candidate.id)}
                onSelect={handleSelect}
              />
            ))}
            {activeCandidates.length === 0 && (
              <p className="text-on-surface-variant text-sm">Không có ứng cử viên nào.</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-10 left-0 w-full px-6 pointer-events-none z-40">
        {hasVoted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto py-5 bg-surface-container-high/90 backdrop-blur-md border border-secondary/30 text-secondary font-body font-bold uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(245,206,83,0.1)] flex items-center justify-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            Đã Ghi Nhận Bình Chọn
          </motion.div>
        ) : !isPollOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto py-5 bg-surface-container-high/90 backdrop-blur-md border border-error/30 text-error font-body font-bold uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(245,83,83,0.1)] flex items-center justify-center gap-3"
          >
            Bình Chọn Đã Đóng
          </motion.div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleVote}
            disabled={isVoting || selectedKings.length !== maxVotesForKing || selectedQueens.length !== maxVotesForQueen}
            className="pointer-events-auto w-full max-w-md mx-auto py-5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-bold uppercase tracking-[0.3em] rounded-xl shadow-[0_0_30px_rgba(245,206,83,0.3)] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isVoting ? 'Đang Gửi...' : `Gửi Bình Chọn (${selectedKings.length + selectedQueens.length}/${maxVotesForKing + maxVotesForQueen})`}
            {!isVoting && <Vote className="w-5 h-5" />}
          </motion.button>
        )}
      </div>
    </main>
  );
}
