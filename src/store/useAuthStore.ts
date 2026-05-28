import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'ADMIN' | 'MÉDICO' | 'PENDENTE';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  doctorId?: string; // If role is MÉDICO, this points to their doctor profile
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, profile: null }),
}));
