import { motion } from 'motion/react';
import { Candidate } from '../types';

interface RankingCardProps {
  candidate: Candidate;
  isFirst?: boolean;
  key?: string;
}

export default function RankingCard({ candidate, isFirst }: RankingCardProps) {
  if (isFirst) {
    return (
      <div className="relative group mb-16">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-surface-bright/60 backdrop-blur-2xl rounded-xl p-6 border border-outline-variant/20 overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold tracking-widest mb-4 border border-primary/30">
                CURRENT SOVEREIGN
              </span>
              <h3 className="font-headline text-3xl text-primary drop-shadow-md mb-1 leading-tight">
                {candidate.name.split(' ')[0]}<br />{candidate.name.split(' ')[1]}
              </h3>
              <p className="text-on-surface-variant text-xs font-medium tracking-wide">{candidate.votes.toLocaleString()} VOTES</p>
            </div>
            <div className="relative -mr-10 -mt-6">
              <div className="w-40 h-48 bg-surface-container-highest rounded-bl-[4rem] overflow-hidden rotate-3 group-hover:rotate-0 transition-transform duration-700">
                <img 
                  src={candidate.imageUrl} 
                  alt={candidate.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="absolute -bottom-2 -left-2 bg-primary text-on-primary font-headline italic text-4xl px-4 py-1 rounded shadow-lg">#1</div>
            </div>
          </div>
          
          <div className="mt-8 space-y-2">
            <div className="flex justify-between items-end text-[10px] font-bold tracking-widest text-on-surface-variant">
              <span>MOMENTUM</span>
              <span className="text-primary">{candidate.momentum}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '88%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-secondary to-primary shadow-[0_0_10px_rgba(245,206,83,0.5)]"
              ></motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container/40 backdrop-blur-md rounded-xl p-4 flex items-center gap-5 border border-outline-variant/10 hover:bg-surface-container-high/60 transition-colors mb-6">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-2 border-tertiary/30 overflow-hidden">
          <img 
            src={candidate.imageUrl} 
            alt={candidate.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -top-1 -left-1 bg-tertiary text-on-surface text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
          {candidate.rank}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1">
          <h5 className="font-headline text-lg text-on-surface">{candidate.name}</h5>
          <span className="text-[11px] font-bold text-on-surface-variant">{candidate.votes.toLocaleString()}</span>
        </div>
        <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${100 - (candidate.rank || 0) * 10}%` }}
            transition={{ duration: 1, delay: (candidate.rank || 0) * 0.1 }}
            className="h-full bg-gradient-to-r from-tertiary to-primary"
          ></motion.div>
        </div>
      </div>
    </div>
  );
}
