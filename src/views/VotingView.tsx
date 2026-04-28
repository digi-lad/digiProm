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
        setPollEndTime(docSnap.data().pollEndTime ?? null);
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
        if (prev.length >= 3) return prev;
        return [...prev, id];
      });
    } else {
      setSelectedQueens(prev => {
        if (prev.includes(id)) return prev.filter(q => q !== id);
        if (prev.length >= 3) return prev;
        return [...prev, id];
      });
    }
  };

  const handleVote = async () => {
    if (!isPollOpen) {
      alert("Bình chọn hiện đang đóng.");
      return;
    }

    if (selectedKings.length !== 3 || selectedQueens.length !== 3) {
      alert("Vui lòng chọn chính xác 3 King và 3 Queen.");
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
    <main className="min-h-screen pt-24 pb-48 px-6 stardust-bg">
      <div className="flex justify-center mb-10 w-full">
        <div className="flex bg-surface-container rounded-full p-1.5 w-full max-w-sm">
          <button 
            onClick={() => setActiveRole('KING')}
            className={`flex-1 py-3 px-6 rounded-full font-bold transition-all duration-300 ${activeRole === 'KING' ? 'text-primary border-b-2 border-secondary' : 'text-on-surface/60'}`}
          >
            <span className="font-body uppercase tracking-widest text-xs">King</span>
          </button>
          <button 
            onClick={() => setActiveRole('QUEEN')}
            className={`flex-1 py-3 px-6 rounded-full font-bold transition-all duration-300 ${activeRole === 'QUEEN' ? 'text-primary border-b-2 border-secondary' : 'text-on-surface/60'}`}
          >
            <span className="font-body uppercase tracking-widest text-xs">Queen</span>
          </button>
        </div>
      </div>

      <div className="mb-12">
        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-2">Lá Phiếu Tinh Tú</p>
        <h2 className="font-headline text-3xl font-bold text-tertiary">Chọn Người Bạn Yêu Thích</h2>
        <p className="text-xs text-primary mt-2">Vé: {ticketCode}</p>
        <p className="text-xs text-on-surface-variant mt-2 font-bold uppercase tracking-widest">
          {activeRole === 'KING' ? `Số King Đã Chọn: ${selectedKings.length}/3` : `Số Queen Đã Chọn: ${selectedQueens.length}/3`}
        </p>
        
        {isPollOpen ? (
          <div className="mt-6 bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Thời Gian Còn Lại</span>
            <span className="font-mono text-3xl text-primary font-bold">{countdownString || '00:00'}</span>
          </div>
        ) : (
          <div className="mt-6 bg-error/20 border border-error/50 rounded-xl p-4 text-center">
            <p className="text-error font-bold uppercase tracking-widest text-sm">Bình Chọn Đã Đóng</p>
            <p className="text-xs text-error/80 mt-1">Vui lòng đợi admin mở bình chọn.</p>
          </div>
        )}
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

      <div className="fixed bottom-28 left-0 w-full px-6 pointer-events-none z-40">
        {hasVoted ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto py-5 bg-surface-container-high/90 backdrop-blur-md border border-secondary/30 text-secondary font-body font-bold uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(245,206,83,0.1)] flex items-center justify-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            Ghi Nhận Bình Chọn Thành Công
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
            disabled={isVoting || selectedKings.length !== 3 || selectedQueens.length !== 3}
            className="pointer-events-auto w-full max-w-md mx-auto py-5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-bold uppercase tracking-[0.3em] rounded-xl shadow-[0_0_30px_rgba(245,206,83,0.3)] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isVoting ? 'Đang Gửi...' : `Gửi Bình Chọn (${selectedKings.length + selectedQueens.length}/6)`}
            {!isVoting && <Vote className="w-5 h-5" />}
          </motion.button>
        )}
      </div>
    </main>
  );
}
