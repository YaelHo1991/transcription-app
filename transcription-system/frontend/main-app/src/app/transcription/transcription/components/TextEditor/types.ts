/**
 * Type definitions for TextEditor component and integration
 */

import { Mark } from '../MediaPlayer/types/marks';
import { RefObject } from 'react';
import { SimpleSpeakerHandle } from '../Speaker/SimpleSpeaker';

/**
 * Main props for TextEditor component
 */
export interface TextEditorProps {
  /** Reference to media player for synchronization */
  mediaPlayerRef?: any;
  
  /** Array of marks from media player */
  marks?: Mark[];
  
  /** Current playback time in seconds */
  currentTime?: number;
  
  /** Callback to seek media player to specific time */
  onSeek?: (time: number) => void;
  
  /** Callback when mark is clicked in editor */
  onMarkClick?: (mark: Mark) => void;
  
  /** Whether editor is enabled for editing */
  enabled?: boolean;
  
  /** Initial content for the editor */
  initialContent?: string;
  
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  
  /** Callback for content changes */
  onContentChange?: (content: string) => void;
  
  /** Current media file name */
  mediaFileName?: string;
  
  /** Media duration in format HH:MM:SS */
  mediaDuration?: string;
  
  /** Current project ID */
  currentProjectId?: string;
  
  /** Name of the current project */
  projectName?: string;
  
  /** Reference to SimpleSpeaker component for speaker synchronization */
  speakerComponentRef?: RefObject<SimpleSpeakerHandle | null>;
  
  /** List of all saved transcriptions from backend */
  transcriptions?: any[];
  
  /** Current transcription index */
  currentTranscriptionIndex?: number;
  
  /** Callback when transcription selection changes */
  onTranscriptionChange?: (index: number) => void;
}

/**
 * Extended mark type for text editor synchronization
 */
export interface SyncedMark extends Mark {
  /** Position in text where this mark references */
  textPosition?: number;
  
  /** Line number in editor */
  lineNumber?: number;
  
  /** Associated text snippet */
  textSnippet?: string;
}

/**
 * Position in the text editor
 */
export interface EditorPosition {
  /** Line number (0-indexed) */
  line: number;
  
  /** Column number (0-indexed) */
  column: number;
  
  /** Absolute character position */
  absolute?: number;
}

/**
 * Text segment with timing information
 */
export interface TimedSegment {
  /** Unique identifier */
  id: string;
  
  /** Start time in seconds */
  startTime: number;
  
  /** End time in seconds */
  endTime: number;
  
  /** Text content */
  text: string;
  
  /** Speaker identifier (optional) */
  speaker?: string;
  
  /** Confidence score (0-1) */
  confidence?: number;
  
  /** Associated mark ID (optional) */
  markId?: string;
}

/**
 * Synchronization state between editor and media player
 */
export interface SyncState {
  /** Whether sync is enabled */
  enabled: boolean;
  
  /** Current sync mode */
  mode: 'manual' | 'auto' | 'follow';
  
  /** Delay in milliseconds for auto-sync */
  syncDelay?: number;
  
  /** Whether to auto-scroll editor */
  autoScroll?: boolean;
  
  /** Whether to highlight current segment */
  highlightCurrent?: boolean;
}

/**
 * Editor commands that can be triggered
 */
export enum EditorCommand {
  INSERT_TIMESTAMP = 'INSERT_TIMESTAMP',
  INSERT_MARK_REF = 'INSERT_MARK_REF',
  JUMP_TO_MARK = 'JUMP_TO_MARK',
  TOGGLE_SYNC = 'TOGGLE_SYNC',
  SAVE_CONTENT = 'SAVE_CONTENT',
  LOAD_CONTENT = 'LOAD_CONTENT',
  CLEAR_CONTENT = 'CLEAR_CONTENT',
  FORMAT_TEXT = 'FORMAT_TEXT',
  EXPORT_TEXT = 'EXPORT_TEXT',
  IMPORT_TEXT = 'IMPORT_TEXT'
}

/**
 * Event types for editor-player communication
 */
export interface EditorEvent {
  type: 'seek' | 'mark-click' | 'content-change' | 'cursor-change' | 'sync-toggle';
  payload: any;
  timestamp: number;
}

/**
 * Configuration for text editor behavior
 */
export interface EditorConfig {
  /** Enable auto-save */
  autoSave: boolean;
  
  /** Auto-save interval in ms */
  autoSaveInterval: number;
  
  /** Enable spell check */
  spellCheck: boolean;
  
  /** Enable auto-correction */
  autoCorrect: boolean;
  
  /** Font size in pixels */
  fontSize: number;
  
  /** Line height multiplier */
  lineHeight: number;
  
  /** Show line numbers */
  showLineNumbers: boolean;
  
  /** Show timestamps inline */
  showTimestamps: boolean;
  
  /** RTL text direction */
  rtl: boolean;
  
  /** Theme: 'dark' or 'light' */
  theme: 'dark' | 'light';
}

/**
 * Storage format for saving editor sessions
 */
export interface EditorSession {
  /** Unique session ID */
  id: string;
  
  /** Media file URL or ID */
  mediaId: string;
  
  /** Text content */
  content: string;
  
  /** Associated marks */
  marks: SyncedMark[];
  
  /** Cursor position */
  cursorPosition: EditorPosition;
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last modification timestamp */
  updatedAt: number;
  
  /** User ID */
  userId?: string;
  
  /** Project ID */
  projectId?: string;
}

/**
 * Keyboard shortcuts configuration
 */
export interface EditorShortcuts {
  insertTimestamp: string[];      // e.g., ['Ctrl+T', 'F7']
  jumpToCurrentTime: string[];    // e.g., ['Ctrl+J', 'F8']
  toggleSync: string[];            // e.g., ['Ctrl+S']
  save: string[];                  // e.g., ['Ctrl+S']
  navigateNextMark: string[];     // e.g., ['Alt+Right']
  navigatePrevMark: string[];     // e.g., ['Alt+Left']
  togglePlayPause: string[];      // e.g., ['Space', 'F5']
}