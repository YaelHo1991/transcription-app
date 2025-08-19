/**
 * Type definitions for Transcription Management System
 */

/**
 * Represents a single transcription that can be associated with one or more media files
 */
export interface TranscriptionData {
  /** Unique identifier for the transcription */
  id: string;
  
  /** Array of media IDs this transcription is associated with */
  mediaIds: string[];
  
  /** The text content of the transcription */
  content: string;
  
  /** Transcription number for display (1, 2, 3...) */
  number: number;
  
  /** Name of the transcription (e.g., "תמלול ראשי") */
  name: string;
  
  /** Speakers associated with this transcription */
  speakers?: SpeakerData[];
  
  /** Remarks/notes associated with this transcription */
  remarks?: RemarkData[];
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** Word count in the transcription */
  wordCount: number;
  
  /** Whether this is a multi-media transcription */
  isMultiMedia: boolean;
  
  /** Media segments for multi-media transcriptions */
  mediaSegments?: MediaSegment[];
}

/**
 * Represents a segment of transcription associated with specific media
 */
export interface MediaSegment {
  /** Media ID this segment belongs to */
  mediaId: string;
  
  /** Start position in the transcription text */
  startIndex: number;
  
  /** End position in the transcription text */
  endIndex: number;
  
  /** Order of this media in the multi-media transcription */
  order: number;
}

/**
 * Speaker data associated with a transcription
 */
export interface SpeakerData {
  /** Unique speaker ID */
  id: string;
  
  /** Speaker name */
  name: string;
  
  /** Speaker color for visual identification */
  color: string;
  
  /** Number of segments for this speaker */
  segmentCount: number;
}

/**
 * Remark/note data associated with a transcription
 */
export interface RemarkData {
  /** Unique remark ID */
  id: string;
  
  /** Remark text */
  text: string;
  
  /** Position in the transcription */
  position: number;
  
  /** Whether this remark is pinned */
  isPinned: boolean;
  
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Mapping between media and their associated transcriptions
 */
export interface MediaTranscriptionMap {
  /** Media ID */
  mediaId: string;
  
  /** Array of transcription IDs associated with this media */
  transcriptionIds: string[];
  
  /** The currently active transcription ID for this media */
  activeTranscriptionId?: string;
}

/**
 * State management for transcriptions
 */
export interface TranscriptionState {
  /** All transcriptions in the system */
  transcriptions: Map<string, TranscriptionData>;
  
  /** Mapping of media to transcriptions */
  mediaTranscriptionMap: Map<string, MediaTranscriptionMap>;
  
  /** Currently active transcription ID */
  activeTranscriptionId?: string;
  
  /** Currently active media ID */
  activeMediaId?: string;
}

/**
 * Actions for transcription management
 */
export enum TranscriptionAction {
  CREATE_NEW = 'CREATE_NEW',
  DELETE = 'DELETE',
  UPDATE_CONTENT = 'UPDATE_CONTENT',
  SWITCH_TRANSCRIPTION = 'SWITCH_TRANSCRIPTION',
  LINK_MEDIA = 'LINK_MEDIA',
  UNLINK_MEDIA = 'UNLINK_MEDIA',
  SPLIT_TRANSCRIPTION = 'SPLIT_TRANSCRIPTION',
  MERGE_TRANSCRIPTIONS = 'MERGE_TRANSCRIPTIONS',
  REORDER_SEGMENTS = 'REORDER_SEGMENTS',
  CLEAR_CONTENT = 'CLEAR_CONTENT'
}

/**
 * Options for creating a new transcription
 */
export interface CreateTranscriptionOptions {
  /** Media ID to associate with */
  mediaId: string;
  
  /** Optional name for the transcription */
  name?: string;
  
  /** Optional initial content */
  content?: string;
  
  /** Whether to copy speakers from another transcription */
  copySpeakers?: boolean;
  
  /** Source transcription ID to copy from */
  sourceTranscriptionId?: string;
}

/**
 * Result of transcription operations
 */
export interface TranscriptionOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  
  /** The transcription ID affected */
  transcriptionId?: string;
  
  /** Error message if operation failed */
  error?: string;
  
  /** Additional data from the operation */
  data?: any;
}