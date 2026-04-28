import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import RankingCard from '../components/RankingCard';
import { Role, Candidate } from '../types';

export default function RankingsView() {
  const [activeRole, setActiveRole] = useState<Role>('KING');
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'candidates'), (snapshot) => {
      const cands: Candidate[] = [];
      snapshot.forEach((doc) => {
        cands.push({ id: doc.id, ...doc.data() } as Candidate);
      });
      setCandidates(cands);
    });
    return () => unsub();
  }, []);

  const kings = candidates.filter(c => c.role === 'KING').sort((a, b) => b.votes - a.votes);
  const queens = candidates.filter(c => c.role === 'QUEEN').sort((a, b) => b.votes - a.votes);

  const activeCandidates = activeRole === 'KING' ? kings : queens;

  return (
    <main className="min-h-screen pt-24 pb-32 px-6 max-w-lg mx-auto">
      <div className="mb-10 text-center relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 nebula-glow -z-10"></div>
        <p className="text-primary text-[10px] uppercase tracking-[0.3em] font-bold mb-2">The Night of Ascension</p>
        <h2 className="font-headline text-4xl text-on-surface leading-tight">Live Rankings</h2>
      </div>

      <div className="flex p-1 bg-surface-container-high/40 backdrop-blur-md rounded-full mb-12 border border-outline-variant/10 shadow-inner">
        <button 
          onClick={() => setActiveRole('KING')}
          className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all ${activeRole === 'KING' ? 'bg-primary-container text-on-primary shadow-[0_0_15px_rgba(245,206,83,0.2)]' : 'text-on-surface-variant'}`}
        >
          KING
        </button>
        <button 
          onClick={() => setActiveRole('QUEEN')}
          className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all ${activeRole === 'QUEEN' ? 'bg-primary-container text-on-primary shadow-[0_0_15px_rgba(245,206,83,0.2)]' : 'text-on-surface-variant'}`}
        >
          QUEEN
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {activeCandidates.length > 0 && <RankingCard candidate={activeCandidates[0]} isFirst />}
          
          <section className="space-y-6 mt-6">
            <h4 className="text-[10px] font-bold tracking-[0.4em] text-on-surface-variant uppercase pl-2 mb-4">Noble Contenders</h4>
            {activeCandidates.slice(1).map(candidate => (
              <RankingCard key={candidate.id} candidate={candidate} />
            ))}
            {activeCandidates.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">No candidates available.</p>
            )}
          </section>
        </motion.div>
      </AnimatePresence>

      <div className="py-12 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-4 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-outline-variant/30"></div>
          <Star className="text-primary/40 w-4 h-4" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-outline-variant/30"></div>
        </div>
        <p className="font-headline italic text-on-surface-variant text-center text-sm px-10 leading-relaxed">
          "The stars align only once. Your vote is the final spark."
        </p>
        <div className="flex items-center gap-2 text-[10px] text-primary/60 font-bold uppercase tracking-[0.2em]">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          LIVE UPDATING
        </div>
      </div>
    </main>
  );
}
