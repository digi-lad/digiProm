export type Role = 'KING' | 'QUEEN';

export interface Candidate {
  id: string;
  name: string;
  title: string;
  role: Role;
  imageUrl: string;
  votes: number;
  momentum?: string;
  rank?: number;
  isLocked?: boolean;
}

export type View = 'VOTING' | 'RANKINGS' | 'ADMIN' | 'LED_LEADERBOARD' | 'GATEWAY';
