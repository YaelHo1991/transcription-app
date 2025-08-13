/**
 * Text Editor - Media Player Synchronization API
 * 
 * This module defines the complete synchronization interface between
 * the text editor and media player components.
 */

import { Mark } from '../../MediaPlayer/types/marks';
import {
  EditorPosition,
  TimedSegment,
  SyncState,
  EditorCommand,
  EditorEvent
} from '../types';

/**
 * Main synchronization interface exposed by the Text Editor
 */
export interface TextEditorAPI {
  // Core Methods
  initialize(): Promise<void>;
  destroy(): void;
  reset(): void;

  // Content Management
  getContent(): string;
  setContent(content: string): void;
  insertText(text: string, position?: EditorPosition): void;
  deleteText(start: EditorPosition, end: EditorPosition): void;
  
  // Time Synchronization
  syncToTime(time: number): void;
  getCurrentSegment(): TimedSegment | null;
  getSegmentAtTime(time: number): TimedSegment | null;
  highlightTimeRange(startTime: number, endTime: number): void;
  clearHighlights(): void;
  
  // Mark Integration
  addMark(mark: Mark): void;
  updateMark(markId: string, updates: Partial<Mark>): void;
  removeMark(markId: string): void;
  highlightMark(markId: string): void;
  scrollToMark(markId: string): void;
  getMarkAtPosition(position: EditorPosition): Mark | null;
  
  // Timestamp Management
  insertTimestamp(time?: number): void;
  updateTimestamp(oldTime: number, newTime: number): void;
  findTimestamps(): Array<{ time: number; position: EditorPosition }>;
  formatTimestamp(time: number): string;
  parseTimestamp(timestamp: string): number | null;
  
  // Selection & Cursor
  getCursorPosition(): EditorPosition;
  setCursorPosition(position: EditorPosition): void;
  getSelection(): { start: EditorPosition; end: EditorPosition } | null;
  setSelection(start: EditorPosition, end: EditorPosition): void;
  
  // Segments Management
  createSegment(text: string, startTime: number, endTime: number): TimedSegment;
  updateSegment(segmentId: string, updates: Partial<TimedSegment>): void;
  deleteSegment(segmentId: string): void;
  getSegments(): TimedSegment[];
  mergeSegments(segmentIds: string[]): TimedSegment;
  splitSegment(segmentId: string, position: EditorPosition): TimedSegment[];
  
  // Playback Control
  play(): void;
  pause(): void;
  togglePlayPause(): void;
  seekForward(seconds?: number): void;
  seekBackward(seconds?: number): void;
  setPlaybackRate(rate: number): void;
  
  // Auto-scroll & Focus
  setAutoScroll(enabled: boolean): void;
  isAutoScrollEnabled(): boolean;
  scrollToTime(time: number): void;
  focusEditor(): void;
  blurEditor(): void;
  
  // State & Configuration
  getSyncState(): SyncState;
  setSyncEnabled(enabled: boolean): void;
  isSyncEnabled(): boolean;
  getConfig(): any;
  updateConfig(config: Partial<any>): void;
  
  // Undo/Redo
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;
  
  // Export/Import
  exportContent(format: 'text' | 'json' | 'srt' | 'vtt'): string;
  importContent(content: string, format: 'text' | 'json' | 'srt' | 'vtt'): void;
  exportSession(): string;
  importSession(session: string): void;
  
  // Event Handlers
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
}

/**
 * Media Player interface expected by the Text Editor
 */
export interface MediaPlayerAPI {
  // Playback Control
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  
  // Mark Management
  getMarks(): Mark[];
  addMark(mark: Partial<Mark>): Mark;
  updateMark(markId: string, updates: Partial<Mark>): void;
  deleteMark(markId: string): void;
  navigateToMark(markId: string): void;
  getNextMark(fromTime?: number): Mark | null;
  getPreviousMark(fromTime?: number): Mark | null;
  
  // Waveform Interaction
  getWaveformData(): Float32Array | null;
  getVisibleTimeRange(): { start: number; end: number };
  zoomIn(): void;
  zoomOut(): void;
  resetZoom(): void;
  
  // Events
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

/**
 * Synchronization Manager - Coordinates between Editor and Player
 */
export class SynchronizationManager {
  private editor: TextEditorAPI;
  private player: MediaPlayerAPI;
  private syncEnabled: boolean = true;
  private autoScroll: boolean = true;
  private syncInterval: number | null = null;
  
  constructor(editor: TextEditorAPI, player: MediaPlayerAPI) {
    this.editor = editor;
    this.player = player;
    this.initialize();
  }
  
  private initialize(): void {
    // Set up event listeners
    this.player.on('timeupdate', this.handleTimeUpdate.bind(this));
    this.player.on('play', this.handlePlay.bind(this));
    this.player.on('pause', this.handlePause.bind(this));
    this.player.on('markAdded', this.handleMarkAdded.bind(this));
    this.player.on('markUpdated', this.handleMarkUpdated.bind(this));
    this.player.on('markDeleted', this.handleMarkDeleted.bind(this));
    
    this.editor.on('seek', this.handleEditorSeek.bind(this));
    this.editor.on('markCreate', this.handleEditorMarkCreate.bind(this));
    this.editor.on('playPause', this.handleEditorPlayPause.bind(this));
    this.editor.on('segmentUpdate', this.handleSegmentUpdate.bind(this));
  }
  
  private handleTimeUpdate(time: number): void {
    if (!this.syncEnabled) return;
    
    this.editor.syncToTime(time);
    
    if (this.autoScroll) {
      this.editor.scrollToTime(time);
    }
  }
  
  private handlePlay(): void {
    this.startSyncInterval();
  }
  
  private handlePause(): void {
    this.stopSyncInterval();
  }
  
  private handleMarkAdded(mark: Mark): void {
    this.editor.addMark(mark);
  }
  
  private handleMarkUpdated(data: { markId: string; updates: Partial<Mark> }): void {
    this.editor.updateMark(data.markId, data.updates);
  }
  
  private handleMarkDeleted(markId: string): void {
    this.editor.removeMark(markId);
  }
  
  private handleEditorSeek(time: number): void {
    this.player.seek(time);
  }
  
  private handleEditorMarkCreate(mark: Partial<Mark>): void {
    this.player.addMark(mark);
  }
  
  private handleEditorPlayPause(): void {
    if (this.player.isPlaying()) {
      this.player.pause();
    } else {
      this.player.play();
    }
  }
  
  private handleSegmentUpdate(segment: TimedSegment): void {
    // Update corresponding mark if exists
    const marks = this.player.getMarks();
    const mark = marks.find(m => m.id === segment.markId);
    
    if (mark) {
      this.player.updateMark(mark.id, {
        time: segment.startTime,
        endTime: segment.endTime
      });
    }
  }
  
  private startSyncInterval(): void {
    if (this.syncInterval) return;
    
    this.syncInterval = window.setInterval(() => {
      const time = this.player.getCurrentTime();
      this.editor.syncToTime(time);
    }, 100);
  }
  
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  public setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
    this.editor.setSyncEnabled(enabled);
    
    if (!enabled) {
      this.stopSyncInterval();
    }
  }
  
  public setAutoScroll(enabled: boolean): void {
    this.autoScroll = enabled;
    this.editor.setAutoScroll(enabled);
  }
  
  public destroy(): void {
    this.stopSyncInterval();
    this.player.off('timeupdate', this.handleTimeUpdate.bind(this));
    this.player.off('play', this.handlePlay.bind(this));
    this.player.off('pause', this.handlePause.bind(this));
    this.editor.destroy();
  }
}

/**
 * Factory function to create synchronized editor-player pair
 */
export function createSynchronizedTranscription(
  editorContainer: HTMLElement,
  playerContainer: HTMLElement,
  options?: {
    autoSync?: boolean;
    autoScroll?: boolean;
    syncInterval?: number;
  }
): {
  editor: TextEditorAPI;
  player: MediaPlayerAPI;
  sync: SynchronizationManager;
} {
  // This would be implemented by the actual components
  // Placeholder for the factory implementation
  throw new Error('Implementation required in actual usage');
}

/**
 * Utility functions for synchronization
 */
export const SyncUtils = {
  /**
   * Calculate time offset between two timestamps
   */
  calculateOffset(time1: number, time2: number): number {
    return Math.abs(time1 - time2);
  },
  
  /**
   * Check if two times are within sync threshold
   */
  isInSync(time1: number, time2: number, threshold: number = 0.5): boolean {
    return this.calculateOffset(time1, time2) <= threshold;
  },
  
  /**
   * Format time for display
   */
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  },
  
  /**
   * Parse formatted time string
   */
  parseTime(timeString: string): number | null {
    const match = timeString.match(/(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?/);
    
    if (!match) return null;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4] || '0', 10);
    
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 100;
  },
  
  /**
   * Interpolate position between two time points
   */
  interpolatePosition(
    currentTime: number,
    startTime: number,
    endTime: number,
    startPos: number,
    endPos: number
  ): number {
    if (currentTime <= startTime) return startPos;
    if (currentTime >= endTime) return endPos;
    
    const progress = (currentTime - startTime) / (endTime - startTime);
    return startPos + (endPos - startPos) * progress;
  }
};

/**
 * Export all types and interfaces
 */
export type {
  Mark,
  EditorPosition,
  TimedSegment,
  SyncState,
  EditorCommand,
  EditorEvent
};