export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface UserProfile {
  age: number | null;
  name: string;
  xp: number;
  streak: number;
  sessionsCompleted: number;
}

export type PracticeType = 'articulation' | 'fluency' | 'social' | null;
