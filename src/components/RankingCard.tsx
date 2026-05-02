import { motion } from 'motion/react';
import { Candidate } from '../types';

interface RankingCardProps {
  candidate: Candidate;
  isTopCard?: boolean;
  rankNumber?: number;
  rankLabel?: string;
  totalTickets?: number;
  key?: string;
}

export default function RankingCard({ candidate, isTopCard, rankNumber = 1, rankLabel = 'KING HIỆN TẠI', totalTickets = 0 }: RankingCardProps) {
  const getTop1NameSize = (name: string) => {
    if (name.length > 20) return 'text-xl';
    if (name.length > 14) return 'text-2xl';
    return 'text-3xl';
  };

  const getRegularNameSize = (name: string) => {
    if (name.length > 22) return 'text-sm';
    if (name.length > 16) return 'text-base';
    return 'text-lg';
  };

  if (isTopCard) {
    return (
      <div className={`relative ${rankNumber === 2 ? 'mb-10 scale-[0.98] opacity-95' : 'mb-12'}`}>
        <div className={`absolute -inset-1 rounded-xl blur opacity-30 ${rankNumber === 1 ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-gradient-to-r from-secondary to-tertiary'}`}></div>
        <div className="relative bg-surface-bright/60 backdrop-blur-2xl rounded-xl p-6 border border-outline-variant/20 overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="z-10">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest mb-4 border ${rankNumber === 1 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-secondary/20 text-secondary border-secondary/30'}`}>
                {rankLabel}
              </span>
              <h3 className={`font-headline drop-shadow-md mb-1 leading-tight ${rankNumber === 1 ? 'text-primary' : 'text-secondary'} ${getTop1NameSize(candidate.name)}`}>
                {candidate.name}
              </h3>
              <p className="text-on-surface-variant text-xs font-medium tracking-wide">{candidate.title || 'Ứng viên sáng giá'}</p>
            </div>
            <div className="relative -mr-10 -mt-6">
              <div className="w-40 h-48 bg-surface-container-highest rounded-bl-[4rem] overflow-hidden">
                <img 
                  src={candidate.imageUrl} 
                  alt={candidate.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 -left-2 bg-primary text-on-primary font-headline italic text-4xl px-4 py-1 rounded shadow-lg">#{rankNumber}</div>
            </div>
          </div>
          
          <div className="mt-8 space-y-2">
            <div className="flex justify-between items-end text-[10px] font-bold tracking-widest text-on-surface-variant">
              <span>SỐ LƯỢNG VOTE</span>
              <span className={rankNumber === 1 ? 'text-primary' : 'text-secondary'}>{candidate.votes.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: totalTickets > 0 ? `${(candidate.votes / totalTickets) * 100}%` : '0%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full shadow-[0_0_10px_rgba(245,206,83,0.5)] ${rankNumber === 1 ? 'bg-gradient-to-r from-secondary to-primary' : 'bg-gradient-to-r from-tertiary to-secondary'}`}
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
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1">
          <h5 className={`font-headline text-on-surface ${getRegularNameSize(candidate.name)}`}>{candidate.name}</h5>
          <span className="text-[11px] font-bold text-on-surface-variant ml-2 shrink-0">{candidate.votes.toLocaleString()}</span>
        </div>
        <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: totalTickets > 0 ? `${(candidate.votes / totalTickets) * 100}%` : '0%' }}
            transition={{ duration: 1, delay: (candidate.rank || 0) * 0.1 }}
            className="h-full bg-gradient-to-r from-tertiary to-primary"
          ></motion.div>
        </div>
      </div>
    </div>
  );
}
