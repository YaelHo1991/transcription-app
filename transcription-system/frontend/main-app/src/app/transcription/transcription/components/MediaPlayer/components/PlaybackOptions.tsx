import React, { useState, useEffect } from 'react';
import { Mark, MarkType } from '../types/marks';

interface PlaybackOptionsProps {
  marks: Mark[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  markFilter: MarkType | null;
}

type PlaybackMode = 'normal' | 'marked-only' | 'skip-marked' | 'loop-mark';

export default function PlaybackOptions({
  marks,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onPlayPause,
  markFilter
}: PlaybackOptionsProps) {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('normal');
  const [loopingMark, setLoopingMark] = useState<Mark | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState(currentTime);

  // Filter marks based on current filter
  const filteredMarks = markFilter 
    ? marks.filter(m => m.type === markFilter)
    : marks;

  // Sort marks by time for navigation
  const sortedMarks = [...filteredMarks].sort((a, b) => a.time - b.time);

  // Check if current time is within a mark
  const isInMark = (time: number): Mark | null => {
    return sortedMarks.find(mark => {
      if (mark.isRange && mark.endTime) {
        return time >= mark.time && time <= mark.endTime;
      }
      return Math.abs(time - mark.time) < 0.5;
    }) || null;
  };

  // Get next mark from current time
  const getNextMark = (fromTime: number): Mark | null => {
    return sortedMarks.find(mark => mark.time > fromTime + 0.1) || null;
  };

  // Get next unmarked section
  const getNextUnmarkedSection = (fromTime: number): number | null => {
    // Find the end of current mark if in one
    const currentMark = isInMark(fromTime);
    if (currentMark && currentMark.endTime) {
      return currentMark.endTime + 0.1;
    }

    // Find next gap between marks
    for (let i = 0; i < sortedMarks.length - 1; i++) {
      const mark = sortedMarks[i];
      const nextMark = sortedMarks[i + 1];
      
      if (mark.endTime && mark.endTime < fromTime && nextMark.time > fromTime) {
        return fromTime; // Already in unmarked section
      }
      
      if (mark.endTime && nextMark.time > mark.endTime + 0.1) {
        if (fromTime < mark.endTime) {
          return mark.endTime + 0.1;
        }
      }
    }

    // Check if there's unmarked content after last mark
    const lastMark = sortedMarks[sortedMarks.length - 1];
    if (lastMark && lastMark.endTime && lastMark.endTime < duration - 0.1) {
      if (fromTime < lastMark.endTime) {
        return lastMark.endTime + 0.1;
      }
    }

    return null;
  };

  // Handle playback based on mode
  useEffect(() => {
    if (!isPlaying) {
      setLastCheckedTime(currentTime);
      return;
    }

    const timeDiff = Math.abs(currentTime - lastCheckedTime);
    
    // Only process if time has changed significantly
    if (timeDiff < 0.1) return;

    switch (playbackMode) {
      case 'marked-only': {
        // Play only within marked sections
        const currentMark = isInMark(currentTime);
        if (!currentMark) {
          // Skip to next mark
          const nextMark = getNextMark(currentTime);
          if (nextMark) {
            onSeek(nextMark.time);
          } else {
            // No more marks, pause
            onPlayPause();
          }
        }
        break;
      }

      case 'skip-marked': {
        // Skip marked sections
        const currentMark = isInMark(currentTime);
        if (currentMark) {
          // Skip to next unmarked section
          const nextUnmarked = getNextUnmarkedSection(currentTime);
          if (nextUnmarked && nextUnmarked < duration) {
            onSeek(nextUnmarked);
          } else {
            // No more unmarked sections, pause
            onPlayPause();
          }
        }
        break;
      }

      case 'loop-mark': {
        // Loop within selected mark
        if (loopingMark && loopingMark.endTime) {
          if (currentTime >= loopingMark.endTime) {
            onSeek(loopingMark.time);
          } else if (currentTime < loopingMark.time) {
            onSeek(loopingMark.time);
          }
        }
        break;
      }

      case 'normal':
      default:
        // Normal playback, no special handling
        break;
    }

    setLastCheckedTime(currentTime);
  }, [currentTime, isPlaying, playbackMode, loopingMark, marks, onSeek, onPlayPause]);

  // Start loop mode for a specific mark
  const startLoopMark = (mark: Mark) => {
    if (mark.isRange && mark.endTime) {
      setLoopingMark(mark);
      setPlaybackMode('loop-mark');
      onSeek(mark.time);
      if (!isPlaying) {
        onPlayPause();
      }
    }
  };

  // Stop loop mode
  const stopLoopMark = () => {
    setLoopingMark(null);
    setPlaybackMode('normal');
  };

  return {
    playbackMode,
    setPlaybackMode,
    loopingMark,
    startLoopMark,
    stopLoopMark,
    isInMark,
    getNextMark,
    getNextUnmarkedSection
  };
}