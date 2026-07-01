import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  showValues: boolean;
  toggleValues: () => void;
  setShowValues: (show: boolean) => void;
  visibilityTimeout: number; // In minutes, 0 means never
  setVisibilityTimeout: (minutes: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showValues: true,
      toggleValues: () => set((state) => ({ showValues: !state.showValues })),
      setShowValues: (show) => set({ showValues: show }),
      visibilityTimeout: 0,
      setVisibilityTimeout: (minutes) => set({ visibilityTimeout: minutes }),
    }),
    {
      name: 'medsync-ui-storage',
    }
  )
);
