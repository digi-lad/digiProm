import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
  key?: string;
}

export default function CandidateCard({ candidate, isSelected, onSelect }: CandidateCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="relative group cursor-pointer"
      onClick={() => onSelect(candidate.id)}
    >
      {isSelected && (
        <div className="absolute -inset-1 bg-gradient-to-tr from-secondary to-primary rounded-xl opacity-100 blur selection-glow"></div>
      )}
      <div className={`relative glass-card rounded-xl p-6 h-full transition-all duration-300 ${isSelected ? 'border-primary' : 'border-outline-variant/15'}`}>
        <div className="flex items-start gap-6">
          <div className="w-24 h-32 -mt-10 overflow-hidden rounded-lg shadow-2xl border border-outline-variant/20">
            <img 
              src={candidate.imageUrl || undefined} 
              alt={candidate.name}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-transform duration-700 ${isSelected ? 'scale-105' : 'scale-100'}`}
            />
          </div>
          <div className="flex-1 pt-2">
            <h3 className={`font-headline text-xl font-bold mb-1 transition-colors ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
              {candidate.name}
            </h3>
            <p className="font-body text-xs text-on-surface-variant mb-4">{candidate.title}</p>
            
            {isSelected ? (
              <div className="flex items-center gap-1 text-secondary">
                <CheckCircle2 className="w-4 h-4 fill-secondary text-on-secondary" />
                <span className="font-body text-[10px] font-bold uppercase tracking-wider">Đang Chọn</span>
              </div>
            ) : (
              <div className="font-body text-[10px] font-bold uppercase tracking-widest text-on-surface/50">
                Nhấn Để Chọn
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
