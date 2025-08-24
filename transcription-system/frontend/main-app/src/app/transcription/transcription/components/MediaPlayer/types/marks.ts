/**
 * Mark types and data structures for the marking system
 */

export enum MarkType {
  SKIP = 'skip',           // Red - Skip sections
  UNCLEAR = 'unclear',     // Yellow - Unclear audio
  REVIEW = 'review',       // Green - Review later
  BOUNDARY = 'boundary',   // Purple - Section boundaries
  CUSTOM = 'custom'        // User-defined marks
}

export interface MarkColor {
  primary: string;
  secondary: string;
  icon: string;
  name: string;
  nameHebrew: string;
}

export const MARK_COLORS: Record<MarkType, MarkColor> = {
  [MarkType.SKIP]: {
    primary: '#ff4444',
    secondary: 'rgba(255, 68, 68, 0.3)',
    icon: '🔴',
    name: 'Skip',
    nameHebrew: 'דלג'
  },
  [MarkType.UNCLEAR]: {
    primary: '#ffaa00',
    secondary: 'rgba(255, 170, 0, 0.3)',
    icon: '🟡',
    name: 'Unclear',
    nameHebrew: 'לא ברור'
  },
  [MarkType.REVIEW]: {
    primary: '#44ff44',
    secondary: 'rgba(68, 255, 68, 0.3)',
    icon: '🟢',
    name: 'Review',
    nameHebrew: 'לבדיקה'
  },
  [MarkType.BOUNDARY]: {
    primary: '#aa44ff',
    secondary: 'rgba(170, 68, 255, 0.3)',
    icon: '🟣',
    name: 'Boundary',
    nameHebrew: 'גבול'
  },
  [MarkType.CUSTOM]: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.3)',
    icon: '⚪',
    name: 'Custom',
    nameHebrew: 'מותאם'
  }
};

export interface Mark {
  id: string;
  time: number;           // Time in seconds (start time for ranges)
  endTime?: number;       // End time for range marks
  type: MarkType;
  label?: string;         // Optional label for custom marks
  customName?: string;    // Custom name for custom marks
  color?: string;         // Optional custom color
  createdAt: number;      // Timestamp
  updatedAt: number;      // Timestamp
  isRange?: boolean;      // Whether this is a range mark
}

export interface MarksState {
  marks: Mark[];
  selectedMarkId: string | null;
  showMarks: boolean;
  filterByType: MarkType | null;
}

/**
 * Generate a unique ID for a mark
 */
export const generateMarkId = (): string => {
  return 'mark_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
};

/**
 * Sort marks by time
 */
export const sortMarksByTime = (marks: Mark[]): Mark[] => {
  return [...marks].sort((a, b) => a.time - b.time);
};

/**
 * Find marks within a time range
 */
export const findMarksInRange = (
  marks: Mark[], 
  startTime: number, 
  endTime: number
): Mark[] => {
  return marks.filter(mark => mark.time >= startTime && mark.time <= endTime);
};

/**
 * Get storage key for marks based on media URL
 */
export const getMarksStorageKey = (mediaUrl: string): string => {
  // Create a hash from the URL for consistent storage key
  let hash = 0;
  for (let i = 0; i < mediaUrl.length; i++) {
    const char = mediaUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'mediaplayer_marks_' + Math.abs(hash);
};