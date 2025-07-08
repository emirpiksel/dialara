import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AppMode = 'crm' | 'training';

interface AppModeStore {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppMode = create<AppModeStore>()(
  persist(
    (set) => ({
      mode: 'crm',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'dialara-app-mode',
    }
  )
);
