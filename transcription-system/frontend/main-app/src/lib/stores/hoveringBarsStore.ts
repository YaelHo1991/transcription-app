import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface HoveringBarsState {
  headerLocked: boolean;
  sidebarLocked: boolean;
  setHeaderLocked: (locked: boolean) => void;
  setSidebarLocked: (locked: boolean) => void;
  toggleHeaderLocked: () => void;
  toggleSidebarLocked: () => void;
}

const useHoveringBarsStore = create<HoveringBarsState>()(
  persist(
    (set, get) => ({
      // Initial state - both bars unlocked by default
      headerLocked: false,
      sidebarLocked: false,

      // Actions to update state
      setHeaderLocked: (locked: boolean) => set({ headerLocked: locked }),
      setSidebarLocked: (locked: boolean) => set({ sidebarLocked: locked }),

      // Toggle actions for convenience
      toggleHeaderLocked: () => set({ headerLocked: !get().headerLocked }),
      toggleSidebarLocked: () => set({ sidebarLocked: !get().sidebarLocked }),
    }),
    {
      name: 'hovering-bars-state', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist the lock states, not the functions
      partialize: (state) => ({
        headerLocked: state.headerLocked,
        sidebarLocked: state.sidebarLocked,
      }),
    }
  )
);

export default useHoveringBarsStore;