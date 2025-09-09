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

// Create a safe storage adapter that checks for browser environment
const safeLocalStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

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
      storage: createJSONStorage(() => safeLocalStorage),
      // Only persist the lock states, not the functions
      partialize: (state) => ({
        headerLocked: state.headerLocked,
        sidebarLocked: state.sidebarLocked,
      }),
    }
  )
);

export default useHoveringBarsStore;