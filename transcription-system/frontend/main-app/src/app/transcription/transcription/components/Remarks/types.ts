/**
 * Type definitions for the Remarks system
 */

/**
 * Remark type enumeration
 */
export enum RemarkType {
  UNCERTAINTY = 1,    // Type 1: Content uncertainty with timestamp
  SPELLING = 2,       // Type 2: Name/spelling consistency
  MEDIA_NOTE = 3,     // Type 3: Notes about media
  PINNED = 4         // Type 4: Pinned reference items
}

/**
 * Confidence level for uncertainty remarks
 */
export enum ConfidenceLevel {
  REGULAR = '',      // Normal uncertainty
  LOW = '?',         // Very unsure
  VERY_LOW = '??'    // Extremely unsure
}

/**
 * Category for pinned reference items
 */
export enum PinnedCategory {
  PEOPLE = 'people',
  COMPANIES = 'companies',
  TERMS = 'terms',
  OTHER = 'other',
  CUSTOM = 'custom'
}

/**
 * Priority level for media notes
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Status of a remark
 */
export enum RemarkStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  VERIFIED = 'verified'
}

/**
 * Timestamp information
 */
export interface Timestamp {
  time: number;           // Time in seconds
  formatted: string;      // Formatted as HH:MM:SS
  context?: string;       // Text context around timestamp
}

/**
 * Base remark interface
 */
export interface BaseRemark {
  id: string;
  type: RemarkType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: RemarkStatus;
  color?: string;         // Theme color for visual indication
}

/**
 * Type 1: Uncertainty remark
 */
export interface UncertaintyRemark extends BaseRemark {
  type: RemarkType.UNCERTAINTY;
  timestamp: Timestamp;
  confidence: ConfidenceLevel;
  originalText: string;   // The uncertain text
  correctedText?: string; // Corrected version if resolved
}

/**
 * Type 2: Spelling/Name remark
 */
export interface SpellingRemark extends BaseRemark {
  type: RemarkType.SPELLING;
  term: string;           // The term/name being tracked
  occurrences: Timestamp[]; // All timestamps where it appears
  suggestions?: string[]; // Similar terms for merging
  standardized?: string;  // Final standardized version
}

/**
 * Type 3: Media note remark
 */
export interface MediaNoteRemark extends BaseRemark {
  type: RemarkType.MEDIA_NOTE;
  timestamp: Timestamp;
  priority: Priority;
  category?: string;      // Type of note (audio quality, background, etc.)
  voiceNote?: string;     // Future: base64 audio data
}

/**
 * Type 4: Pinned reference remark
 */
export interface PinnedRemark extends BaseRemark {
  type: RemarkType.PINNED;
  category: PinnedCategory;
  customCategory?: string; // If category is CUSTOM
  isPinned: boolean;      // Always true for this type
  order?: number;         // Display order
}

/**
 * Union type for all remark types
 */
export type Remark = UncertaintyRemark | SpellingRemark | MediaNoteRemark | PinnedRemark;

/**
 * Filter options for remarks display
 */
export interface RemarkFilters {
  types: RemarkType[];
  status: RemarkStatus[];
  searchTerm?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Sort options for remarks
 */
export enum SortBy {
  TIME = 'time',
  TYPE = 'type',
  STATUS = 'status',
  PRIORITY = 'priority'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export interface SortOptions {
  by: SortBy;
  order: SortOrder;
}

/**
 * Statistics for remarks
 */
export interface RemarkStatistics {
  total: number;
  byType: Record<RemarkType, number>;
  byStatus: Record<RemarkStatus, number>;
  resolutionRate: number;
  mostFrequentTerms: Array<{ term: string; count: number }>;
}

/**
 * Event types for remarks system
 */
export enum RemarkEvent {
  CREATE = 'remarkCreate',
  UPDATE = 'remarkUpdate',
  DELETE = 'remarkDelete',
  NAVIGATE = 'remarkNavigate',
  FILTER = 'remarkFilter',
  SYNC = 'remarkSync'
}

/**
 * Event payloads
 */
export interface RemarkEventPayload {
  type: RemarkEvent;
  data: any;
  timestamp: number;
}

/**
 * Context state for remarks
 */
export interface RemarksState {
  remarks: Remark[];
  filters: RemarkFilters;
  sortOptions: SortOptions;
  selectedRemarkId?: string;
  isLoading: boolean;
  error?: string;
}

/**
 * Actions for remarks context
 */
export enum RemarkAction {
  ADD = 'ADD_REMARK',
  UPDATE = 'UPDATE_REMARK',
  DELETE = 'DELETE_REMARK',
  SET_FILTER = 'SET_FILTER',
  SET_SORT = 'SET_SORT',
  SELECT = 'SELECT_REMARK',
  LOAD = 'LOAD_REMARKS',
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR'
}

/**
 * Color theme for remarks (matching page theme)
 */
export const REMARK_COLORS = {
  [RemarkType.UNCERTAINTY]: 'rgba(187, 247, 208, 0.4)',   // Very light green
  [RemarkType.SPELLING]: 'rgba(254, 202, 202, 0.3)',      // Light red
  [RemarkType.MEDIA_NOTE]: 'rgba(191, 219, 254, 0.3)',    // Light blue
  [RemarkType.PINNED]: 'linear-gradient(135deg, #0d5a5a, #1a5d5d)' // Gradient
} as const;

/**
 * In-text tag definitions
 */
export interface InTextTag {
  id: string;
  display: string;    // Display text
  value: string;      // Actual value to insert
  category?: string;  // Tag category
  isCustom?: boolean; // User-defined tag
}

export const DEFAULT_TAGS: InTextTag[] = [
  { id: 'multiple', display: 'מדברים יחד', value: '[מדברים יחד]' },
  { id: 'laughter', display: 'צחוק', value: '[צחוק]' },
  { id: 'pause', display: 'השתקה', value: '[השתקה]' },
  { id: 'unclear', display: 'לא ברור', value: '[לא ברור]' },
  { id: 'background', display: 'רעש רקע', value: '[רעש רקע]' },
  { id: 'applause', display: 'מחיאות כפיים', value: '[מחיאות כפיים]' },
  { id: 'music', display: 'מוזיקה', value: '[מוזיקה]' },
  { id: 'technical', display: 'הפרעה טכנית', value: '[הפרעה טכנית]' }
];

/**
 * Template definitions for common remarks
 */
export interface RemarkTemplate {
  id: string;
  name: string;
  type: RemarkType;
  content: string;
  category?: string;
}

export const DEFAULT_TEMPLATES: RemarkTemplate[] = [
  { id: 'unclear-speaker', name: 'דובר לא ברור', type: RemarkType.MEDIA_NOTE, content: 'לא ברור מי הדובר' },
  { id: 'multiple-speakers', name: 'מספר דוברים', type: RemarkType.MEDIA_NOTE, content: 'מספר דוברים מדברים יחד' },
  { id: 'technical-issue', name: 'בעיה טכנית', type: RemarkType.MEDIA_NOTE, content: 'בעיה טכנית באודיו' },
  { id: 'verify-term', name: 'אמת מונח', type: RemarkType.SPELLING, content: 'יש לאמת איות המונח' }
];