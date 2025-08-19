'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  Remark,
  RemarksState,
  RemarkAction,
  RemarkFilters,
  SortOptions,
  RemarkType,
  RemarkStatus,
  SortBy,
  SortOrder,
  RemarkEvent,
  RemarkEventPayload
} from './types';

/**
 * Initial state for remarks
 */
const initialState: RemarksState = {
  remarks: [],
  filters: {
    types: [RemarkType.UNCERTAINTY, RemarkType.SPELLING, RemarkType.MEDIA_NOTE, RemarkType.PINNED],
    status: [RemarkStatus.OPEN, RemarkStatus.RESOLVED, RemarkStatus.VERIFIED]
  },
  sortOptions: {
    by: SortBy.TIME,
    order: SortOrder.DESC
  },
  isLoading: false,
  error: undefined
};

/**
 * Action types for reducer
 */
type Action =
  | { type: RemarkAction.ADD; payload: Remark }
  | { type: RemarkAction.UPDATE; payload: { id: string; updates: Partial<Remark> } }
  | { type: RemarkAction.DELETE; payload: string }
  | { type: RemarkAction.SET_FILTER; payload: Partial<RemarkFilters> }
  | { type: RemarkAction.SET_SORT; payload: SortOptions }
  | { type: RemarkAction.SELECT; payload: string | undefined }
  | { type: RemarkAction.LOAD; payload: Remark[] }
  | { type: RemarkAction.SET_LOADING; payload: boolean }
  | { type: RemarkAction.SET_ERROR; payload: string }
  | { type: RemarkAction.CLEAR_ERROR };

/**
 * Reducer function for remarks state
 */
function remarksReducer(state: RemarksState, action: Action): RemarksState {
  switch (action.type) {
    case RemarkAction.ADD:
      return {
        ...state,
        remarks: [...state.remarks, action.payload]
      };

    case RemarkAction.UPDATE:
      return {
        ...state,
        remarks: state.remarks.map(remark =>
          remark.id === action.payload.id
            ? { ...remark, ...action.payload.updates, updatedAt: new Date() }
            : remark
        )
      };

    case RemarkAction.DELETE:
      return {
        ...state,
        remarks: state.remarks.filter(remark => remark.id !== action.payload)
      };

    case RemarkAction.SET_FILTER:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case RemarkAction.SET_SORT:
      return {
        ...state,
        sortOptions: action.payload
      };

    case RemarkAction.SELECT:
      return {
        ...state,
        selectedRemarkId: action.payload
      };

    case RemarkAction.LOAD:
      return {
        ...state,
        remarks: action.payload,
        isLoading: false
      };

    case RemarkAction.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case RemarkAction.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case RemarkAction.CLEAR_ERROR:
      return {
        ...state,
        error: undefined
      };

    default:
      return state;
  }
}

/**
 * Context type
 */
interface RemarksContextType {
  state: RemarksState;
  addRemark: (remark: Omit<Remark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRemark: (id: string, updates: Partial<Remark>) => void;
  deleteRemark: (id: string) => void;
  setFilter: (filter: Partial<RemarkFilters>) => void;
  setSort: (sort: SortOptions) => void;
  selectRemark: (id?: string) => void;
  getFilteredRemarks: () => Remark[];
  getSortedRemarks: (remarks: Remark[]) => Remark[];
  navigateToTimestamp: (time: number) => void;
  updateAllOccurrences: (remarkId: string, newValue: string) => void;
}

/**
 * Create context
 */
const RemarksContext = createContext<RemarksContextType | null>(null);

/**
 * Provider component
 */
interface RemarksProviderProps {
  children: ReactNode;
  transcriptionId?: string;
}

export function RemarksProvider({ children, transcriptionId }: RemarksProviderProps) {
  // Use transcription ID or session ID for storage key
  const storageKey = transcriptionId 
    ? `transcription-remarks-${transcriptionId}`
    : `transcription-remarks-session-${Date.now()}`;
  const [state, dispatch] = useReducer(remarksReducer, initialState);

  /**
   * Load remarks from localStorage on mount
   */
  useEffect(() => {
    const loadRemarks = () => {
      try {
        // Check for a clear flag in URL params (for development)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('clearRemarks') === 'true') {
          localStorage.removeItem(storageKey);
          console.log('Cleared remarks from localStorage');
          return;
        }
        
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const remarks = parsed.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt)
          }));
          
          // Clear old demo remarks and duplicates
          const seen = new Set();
          const nonDemoRemarks = remarks.filter((r: any) => {
            // Filter out old demo remarks by checking their content
            const isDemoRemark = (
              r.content === 'CEO: דוד כהן' ||
              r.content === 'לא בטוח אם אמר "חמישה עשר" או "חמישים"' ||
              r.content === 'טכנוטרון - חברת הטכנולוגיה' ||
              r.content === 'רעש רקע חזק - כנראה עבודות בנייה'
            );
            
            // Also filter duplicates with same timestamp and content
            const key = `${r.timestamp?.formatted || ''}-${r.content || r.originalText || ''}`;
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            
            return !isDemoRemark;
          });
          
          dispatch({ type: RemarkAction.LOAD, payload: nonDemoRemarks });
        }
      } catch (error) {
        console.error('Failed to load remarks from localStorage:', error);
        dispatch({ type: RemarkAction.SET_ERROR, payload: 'Failed to load saved remarks' });
      }
    };

    loadRemarks();
  }, [storageKey]);

  /**
   * Save remarks to localStorage whenever they change
   */
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state.remarks));
    } catch (error) {
      console.error('Failed to save remarks to localStorage:', error);
    }
  }, [state.remarks, storageKey]);

  /**
   * Add a new remark
   */
  const addRemark = (remark: Omit<Remark, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRemark: Remark = {
      ...remark,
      id: `remark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Remark;

    dispatch({ type: RemarkAction.ADD, payload: newRemark });

    // Dispatch custom event
    const event = new CustomEvent(RemarkEvent.CREATE, {
      detail: { remark: newRemark }
    });
    document.dispatchEvent(event);
  };

  /**
   * Update a remark
   */
  const updateRemark = (id: string, updates: Partial<Remark>) => {
    dispatch({ type: RemarkAction.UPDATE, payload: { id, updates } });

    // Dispatch custom event
    const event = new CustomEvent(RemarkEvent.UPDATE, {
      detail: { id, updates }
    });
    document.dispatchEvent(event);
  };

  /**
   * Delete a remark
   */
  const deleteRemark = (id: string) => {
    dispatch({ type: RemarkAction.DELETE, payload: id });

    // Dispatch custom event
    const event = new CustomEvent(RemarkEvent.DELETE, {
      detail: { id }
    });
    document.dispatchEvent(event);
  };

  /**
   * Set filter
   */
  const setFilter = (filter: Partial<RemarkFilters>) => {
    dispatch({ type: RemarkAction.SET_FILTER, payload: filter });

    // Dispatch custom event
    const event = new CustomEvent(RemarkEvent.FILTER, {
      detail: { filter }
    });
    document.dispatchEvent(event);
  };

  /**
   * Set sort options
   */
  const setSort = (sort: SortOptions) => {
    dispatch({ type: RemarkAction.SET_SORT, payload: sort });
  };

  /**
   * Select a remark
   */
  const selectRemark = (id?: string) => {
    dispatch({ type: RemarkAction.SELECT, payload: id });
  };

  /**
   * Get filtered remarks
   */
  const getFilteredRemarks = (): Remark[] => {
    let filtered = [...state.remarks];

    // Filter by type
    if (state.filters.types.length > 0) {
      filtered = filtered.filter(r => state.filters.types.includes(r.type));
    }

    // Filter by status
    if (state.filters.status.length > 0) {
      filtered = filtered.filter(r => state.filters.status.includes(r.status));
    }

    // Filter by search term
    if (state.filters.searchTerm) {
      const term = state.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.content.toLowerCase().includes(term)
      );
    }

    // Filter by date range
    if (state.filters.dateRange) {
      filtered = filtered.filter(r => {
        const date = r.createdAt;
        return date >= state.filters.dateRange!.start && date <= state.filters.dateRange!.end;
      });
    }

    return filtered;
  };

  /**
   * Get sorted remarks
   */
  const getSortedRemarks = (remarks: Remark[]): Remark[] => {
    const sorted = [...remarks];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (state.sortOptions.by) {
        case SortBy.TIME:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case SortBy.TYPE:
          comparison = a.type - b.type;
          break;
        case SortBy.STATUS:
          comparison = a.status.localeCompare(b.status);
          break;
        case SortBy.PRIORITY:
          // Only for media notes
          if (a.type === RemarkType.MEDIA_NOTE && b.type === RemarkType.MEDIA_NOTE) {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            comparison = priorityOrder[(a as any).priority] - priorityOrder[(b as any).priority];
          }
          break;
      }

      return state.sortOptions.order === SortOrder.ASC ? comparison : -comparison;
    });

    // Always keep pinned items at top
    const pinned = sorted.filter(r => r.type === RemarkType.PINNED);
    const unpinned = sorted.filter(r => r.type !== RemarkType.PINNED);
    
    return [...pinned, ...unpinned];
  };

  /**
   * Navigate to timestamp
   */
  const navigateToTimestamp = (time: number) => {
    const event = new CustomEvent(RemarkEvent.NAVIGATE, {
      detail: { time }
    });
    document.dispatchEvent(event);
  };

  /**
   * Update all occurrences (for Type 2 spelling remarks)
   */
  const updateAllOccurrences = (remarkId: string, newValue: string) => {
    const remark = state.remarks.find(r => r.id === remarkId);
    if (remark && remark.type === RemarkType.SPELLING) {
      // This will be implemented in a later stage
      // For now, just update the remark
      updateRemark(remarkId, { content: newValue });
    }
  };

  const value: RemarksContextType = {
    state,
    addRemark,
    updateRemark,
    deleteRemark,
    setFilter,
    setSort,
    selectRemark,
    getFilteredRemarks,
    getSortedRemarks,
    navigateToTimestamp,
    updateAllOccurrences
  };

  return (
    <RemarksContext.Provider value={value}>
      {children}
    </RemarksContext.Provider>
  );
}

/**
 * Hook to use remarks context
 */
export function useRemarks() {
  const context = useContext(RemarksContext);
  if (!context) {
    throw new Error('useRemarks must be used within RemarksProvider');
  }
  return context;
}