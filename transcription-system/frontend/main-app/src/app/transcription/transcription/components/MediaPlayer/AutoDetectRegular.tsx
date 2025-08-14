'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AutoDetectRegularProps {
  enabled: boolean;
  delay: number;
  rewindOnPause: { enabled: boolean; amount: number };
  isPlaying: boolean;
  onPlayPause: () => void;
  onRewind?: (seconds: number) => void;
}

export default function AutoDetectRegular({
  enabled,
  delay,
  rewindOnPause,
  isPlaying,
  onPlayPause,
  onRewind
}: AutoDetectRegularProps) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const wasPlayingBeforeTypingRef = useRef(false);

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
    
    // Regular mode: pause when typing starts
    if (isPlaying && !wasPlayingBeforeTypingRef.current) {
      wasPlayingBeforeTypingRef.current = true;
      
      // Pause playback
      onPlayPause();
      
      // Apply rewind if enabled
      if (rewindOnPause.enabled && rewindOnPause.amount > 0 && onRewind) {
        onRewind(rewindOnPause.amount);
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to resume
    typingTimeoutRef.current = window.setTimeout(() => {
      if (wasPlayingBeforeTypingRef.current) {
        onPlayPause(); // Resume
        wasPlayingBeforeTypingRef.current = false;
      }
      setIsTyping(false);
    }, delay * 1000);
    
    setIsTyping(true);
  };

  // Set up typing detection listeners
  useEffect(() => {
    if (!enabled) {
      // Clear any existing timeouts when disabled
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setIsTyping(false);
      wasPlayingBeforeTypingRef.current = false;
      return;
    }

    const handleInput = (event: Event) => {
      // Only detect typing if cursor is in text editor
      if (isTextEditorElement(event.target)) {
        handleTypingDetected();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only detect typing if cursor is in text editor
      if (isTextEditorElement(event.target)) {
        // Ignore modifier keys alone
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(event.key)) {
          return;
        }
        handleTypingDetected();
      }
    };

    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('input', handleInput);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Clear timeout on cleanup
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [enabled, isPlaying, delay, rewindOnPause]);

  // This component doesn't render anything - it's just logic
  return null;
}