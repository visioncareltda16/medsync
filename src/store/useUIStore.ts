import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  showValues: boolean;
  toggleValues: () => void;
  setShowValues: (show: boolean) => void;
  sessionTimeout: number; // In minutes
  setSessionTimeout: (minutes: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showValues: true,
      toggleValues: () => set((state) => ({ showValues: !state.showValues })),
      setShowValues: (show) => set({ showValues: show }),
      sessionTimeout: 30, // default 30 minutes
      setSessionTimeout: (minutes) => set({ sessionTimeout: minutes }),
    }),
    {
      name: 'medsync-ui-storage',
    }
  )
);
