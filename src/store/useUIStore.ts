import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  showValues: boolean;
  toggleValues: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      showValues: true,
      toggleValues: () => set((state) => ({ showValues: !state.showValues })),
    }),
    {
      name: 'medsync-ui-storage',
    }
  )
);
