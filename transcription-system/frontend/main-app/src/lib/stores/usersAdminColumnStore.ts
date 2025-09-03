import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UsersAdminColumnState {
  expandedColumns: Set<string>;
  setExpandedColumns: (columns: Set<string>) => void;
  toggleColumn: (columnId: string) => void;
  resetToDefault: () => void;
}

// Default expanded columns
const DEFAULT_EXPANDED_COLUMNS = new Set(['name', 'email', 'permissions', 'actions']);

const useUsersAdminColumnStore = create<UsersAdminColumnState>()(
  persist(
    (set, get) => ({
      // Initial state - default expanded columns
      expandedColumns: DEFAULT_EXPANDED_COLUMNS,

      // Actions to update state
      setExpandedColumns: (columns: Set<string>) => set({ expandedColumns: columns }),

      // Toggle individual column
      toggleColumn: (columnId: string) => {
        const current = get().expandedColumns;
        const newSet = new Set(current);
        if (newSet.has(columnId)) {
          newSet.delete(columnId);
        } else {
          newSet.add(columnId);
        }
        set({ expandedColumns: newSet });
      },

      // Reset to default state
      resetToDefault: () => set({ expandedColumns: new Set(DEFAULT_EXPANDED_COLUMNS) }),
    }),
    {
      name: 'users-admin-columns-state', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Custom serialization/deserialization for Set objects
      partialize: (state) => ({
        expandedColumns: Array.from(state.expandedColumns), // Convert Set to Array for storage
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert Array back to Set when loading from storage
          state.expandedColumns = new Set(state.expandedColumns as any);
        }
      },
    }
  )
);

export default useUsersAdminColumnStore;