import { useState, useEffect, useCallback, useRef } from 'react';
import { Mark, MarkType } from '../../MediaPlayer/types/marks';
import { SyncState, EditorPosition, TimedSegment } from '../types';

interface UseMediaSyncProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  marks: Mark[];
  onSeek: (time: number) => void;
  onMarkCreate?: (mark: Partial<Mark>) => void;
  onMarkUpdate?: (markId: string, updates: Partial<Mark>) => void;
  syncEnabled?: boolean;
  autoScroll?: boolean;
  highlightDelay?: number;
}

interface UseMediaSyncReturn {
  syncState: SyncState;
  activeMark: Mark | null;
  activeSegment: TimedSegment | null;
  cursorPosition: EditorPosition | null;
  setSyncEnabled: (enabled: boolean) => void;
  setAutoScroll: (enabled: boolean) => void;
  syncToTime: (time: number) => void;
  syncToMark: (markId: string) => void;
  syncToSegment: (segment: TimedSegment) => void;
  insertTimestamp: () => string;
  createMarkAtCursor: (position: EditorPosition) => void;
  updateSegmentTiming: (segmentId: string, startTime: number, endTime: number) => void;
  getSegmentAtTime: (time: number) => TimedSegment | null;
  getMarkAtTime: (time: number) => Mark | null;
}

export function useMediaSync({
  currentTime,
  duration,
  isPlaying,
  marks,
  onSeek,
  onMarkCreate,
  onMarkUpdate,
  syncEnabled: initialSyncEnabled = true,
  autoScroll: initialAutoScroll = true,
  highlightDelay = 100
}: UseMediaSyncProps): UseMediaSyncReturn {
  const [syncEnabled, setSyncEnabled] = useState(initialSyncEnabled);
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [activeMark, setActiveMark] = useState<Mark | null>(null);
  const [activeSegment, setActiveSegment] = useState<TimedSegment | null>(null);
  const [cursorPosition, setCursorPosition] = useState<EditorPosition | null>(null);
  const [segments, setSegments] = useState<TimedSegment[]>([]);
  
  const highlightTimeoutRef = useRef<number | undefined>(undefined);
  const lastHighlightedMarkRef = useRef<string | null>(null);
  const lastHighlightedSegmentRef = useRef<string | null>(null);

  // Find active mark based on current time
  useEffect(() => {
    if (!syncEnabled) return;

    const mark = getMarkAtTime(currentTime);
    
    if (mark?.id !== lastHighlightedMarkRef.current) {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      
      highlightTimeoutRef.current = window.setTimeout(() => {
        setActiveMark(mark);
        lastHighlightedMarkRef.current = mark?.id || null;
      }, highlightDelay);
    }

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [currentTime, marks, syncEnabled, highlightDelay]);

  // Find active segment based on current time
  useEffect(() => {
    if (!syncEnabled) return;

    const segment = getSegmentAtTime(currentTime);
    
    if (segment?.id !== lastHighlightedSegmentRef.current) {
      setActiveSegment(segment);
      lastHighlightedSegmentRef.current = segment?.id || null;
    }
  }, [currentTime, segments, syncEnabled]);

  // Get mark at specific time
  const getMarkAtTime = useCallback((time: number): Mark | null => {
    return marks.find(mark => {
      if (mark.isRange && mark.endTime) {
        return time >= mark.time && time <= mark.endTime;
      }
      return Math.abs(time - mark.time) < 0.5;
    }) || null;
  }, [marks]);

  // Get segment at specific time
  const getSegmentAtTime = useCallback((time: number): TimedSegment | null => {
    return segments.find(segment => 
      time >= segment.startTime && time <= segment.endTime
    ) || null;
  }, [segments]);

  // Sync to specific time
  const syncToTime = useCallback((time: number) => {
    if (time >= 0 && time <= duration) {
      onSeek(time);
    }
  }, [duration, onSeek]);

  // Sync to specific mark
  const syncToMark = useCallback((markId: string) => {
    const mark = marks.find(m => m.id === markId);
    if (mark) {
      syncToTime(mark.time);
      setActiveMark(mark);
    }
  }, [marks, syncToTime]);

  // Sync to specific segment
  const syncToSegment = useCallback((segment: TimedSegment) => {
    syncToTime(segment.startTime);
    setActiveSegment(segment);
  }, [syncToTime]);

  // Insert timestamp at current position
  const insertTimestamp = useCallback((): string => {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const milliseconds = Math.floor((currentTime % 1) * 100);
    return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}]`;
  }, [currentTime]);

  // Create mark at cursor position
  const createMarkAtCursor = useCallback((position: EditorPosition) => {
    if (!onMarkCreate) return;

    const newMark: Partial<Mark> = {
      time: currentTime,
      type: MarkType.CUSTOM,
      label: `Mark at line ${position.line}`,
      customName: `Editor Mark ${position.line}:${position.column}`
    };

    onMarkCreate(newMark);
    setCursorPosition(position);
  }, [currentTime, onMarkCreate]);

  // Update segment timing
  const updateSegmentTiming = useCallback((segmentId: string, startTime: number, endTime: number) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId 
        ? { ...segment, startTime, endTime }
        : segment
    ));

    // If this segment has an associated mark, update it
    const segment = segments.find(s => s.id === segmentId);
    if (segment?.markId && onMarkUpdate) {
      onMarkUpdate(segment.markId, {
        time: startTime,
        endTime: endTime
      });
    }
  }, [segments, onMarkUpdate]);

  // Compute sync state
  const syncState: SyncState = {
    enabled: syncEnabled,
    mode: autoScroll ? 'auto' : 'manual',
    autoScroll,
    highlightCurrent: true,
    syncDelay: highlightDelay
  };

  return {
    syncState,
    activeMark,
    activeSegment,
    cursorPosition,
    setSyncEnabled,
    setAutoScroll,
    syncToTime,
    syncToMark,
    syncToSegment,
    insertTimestamp,
    createMarkAtCursor,
    updateSegmentTiming,
    getSegmentAtTime,
    getMarkAtTime
  };
}