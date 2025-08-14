'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AutoDetectEnhancedProps {
  enabled: boolean;
  firstPauseDelay: number;  // Delay before first pause (0.5s/1s/2s)
  secondPauseDelay: number; // Delay for second pause detection
  autoResumeDelay: number;  // Delay for auto-resume
  rewindOnPause: { enabled: boolean; amount: number };
  isPlaying: boolean;
  onPlayPause: () => void;
  onRewind?: (seconds: number) => void;
}

export default function AutoDetectEnhanced({
  enabled,
  firstPauseDelay,
  secondPauseDelay,
  autoResumeDelay,
  rewindOnPause,
  isPlaying,
  onPlayPause,
  onRewind
}: AutoDetectEnhancedProps) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const autoResumeTimeoutRef = useRef<number | null>(null);
  const wasPlayingBeforeTypingRef = useRef(false);
  const shouldResumeRef = useRef(false);
  
  // Store values in refs to avoid stale closures
  const isPlayingRef = useRef(isPlaying);
  const firstPauseDelayRef = useRef(firstPauseDelay);
  const secondPauseDelayRef = useRef(secondPauseDelay);
  const autoResumeDelayRef = useRef(autoResumeDelay);
  const rewindOnPauseRef = useRef(rewindOnPause);
  const onPlayPauseRef = useRef(onPlayPause);
  const onRewindRef = useRef(onRewind);
  
  // Update refs when props change
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    firstPauseDelayRef.current = firstPauseDelay;
    secondPauseDelayRef.current = secondPauseDelay;
    autoResumeDelayRef.current = autoResumeDelay;
    rewindOnPauseRef.current = rewindOnPause;
    onPlayPauseRef.current = onPlayPause;
    onRewindRef.current = onRewind;
  }, [firstPauseDelay, secondPauseDelay, autoResumeDelay, rewindOnPause, onPlayPause, onRewind]);
  
  // Check if element is part of text editor
  const isTextEditorElement = (element: EventTarget | null): boolean => {
    if (!element || !(element instanceof HTMLElement)) return false;
    
    // Check if it's a text input area
    if (element instanceof HTMLInputElement || 
        element instanceof HTMLTextAreaElement ||
        element.contentEditable === 'true') {
      
      // Also check for specific classes
      if (element.closest('.transcription-textarea') ||
          element.closest('.text-editor-container') ||
          element.closest('.transcription-text')) {
        return true;
      }
      
      // Skip if it's a settings input
      if (element.closest('.settings-modal') ||
          element.closest('.media-modal-overlay')) {
        return false;
      }
      
      return true;
    }
    
    return false;
  };

  // Handle typing detected
  const handleTypingDetected = () => {
    if (!enabled) return;
    
    setIsTyping(true);
    
    // Clear existing timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Clear auto-resume timeout when typing is detected
    if (autoResumeTimeoutRef.current) {
      clearTimeout(autoResumeTimeoutRef.current);
      autoResumeTimeoutRef.current = null;
    }
    
    // Check if media is currently paused
    if (!isPlayingRef.current) {
      // STEP 2: Media is paused, typing detected
      // Mark that we should resume after typing stops
      shouldResumeRef.current = true;
      
      // Set timeout to resume media after typing stops for the configured delay
      typingTimeoutRef.current = window.setTimeout(() => {
        if (shouldResumeRef.current && onPlayPauseRef.current) {
          // Resume playback
          onPlayPauseRef.current();
          console.log(`[Enhanced Mode] Media resumed after ${secondPauseDelayRef.current}s of no typing`);
          
          // Reset the flags
          shouldResumeRef.current = false;
          wasPlayingBeforeTypingRef.current = false;
        }
        setIsTyping(false);
      }, secondPauseDelayRef.current * 1000);
      
    } else {
      // STEP 1: Media is playing, typing detected
      // Continue playing while typing, pause only after typing stops
      shouldResumeRef.current = false; // Not resuming, we're pausing
      
      // Set timeout for first pause - pause media after typing stops for the configured delay
      typingTimeoutRef.current = window.setTimeout(() => {
        if (onPlayPauseRef.current) {
          // Pause playback
          onPlayPauseRef.current();
          wasPlayingBeforeTypingRef.current = true;
          
          // Apply rewind if enabled
          if (rewindOnPauseRef.current.enabled && rewindOnPauseRef.current.amount > 0 && onRewindRef.current) {
            onRewindRef.current(rewindOnPauseRef.current.amount);
          }
          
          console.log(`[Enhanced Mode] Media paused after ${firstPauseDelayRef.current}s of no typing`);
          setIsTyping(false);
          
          // STEP 3: Start auto-resume timer after pause
          // If no typing occurs, resume after autoResumeDelay
          autoResumeTimeoutRef.current = window.setTimeout(() => {
            if (wasPlayingBeforeTypingRef.current && onPlayPauseRef.current) {
              // Resume playback
              onPlayPauseRef.current();
              console.log(`[Enhanced Mode] Auto-resumed after ${autoResumeDelayRef.current}s of no activity`);
              wasPlayingBeforeTypingRef.current = false;
            }
          }, autoResumeDelayRef.current * 1000);
        }
      }, firstPauseDelayRef.current * 1000);
    }
  };

  // Set up typing detection listeners
  useEffect(() => {
    if (!enabled) {
      // Clear any existing timeouts when disabled
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
        autoResumeTimeoutRef.current = null;
      }
      setIsTyping(false);
      shouldResumeRef.current = false;
      wasPlayingBeforeTypingRef.current = false;
      return;
    }

    const handleInput = (event: Event) => {
      if (isTextEditorElement(event.target)) {
        handleTypingDetected();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only respond to actual key presses, not mouse clicks
      if (!event.key || event.key === 'Unidentified') return;
      
      // Ignore modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(event.key)) return;
      
      if (isTextEditorElement(event.target)) {
        handleTypingDetected();
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Clear timeouts on cleanup
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
      }
    };
  }, [enabled]); // Only depend on enabled since we use refs for other values

  // This component doesn't render anything - it's just logic
  return null;
}