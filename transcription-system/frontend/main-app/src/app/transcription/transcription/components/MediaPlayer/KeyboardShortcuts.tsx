'use client';

import React, { useEffect, useRef } from 'react';
import { KeyboardShortcut } from './types';

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled: boolean;
  onAction: (action: string) => void;
}

// Default shortcuts - EXACT COPY from original HTML player
export const defaultShortcuts: KeyboardShortcut[] = [
  // Group 1: Playbook Control (בקרת הפעלה)
  { action: 'playPause', key: ' ', description: 'הפעל/השהה', enabled: true, group: 'בקרת הפעלה' },
  { action: 'stop', key: 'Escape', description: 'עצור', enabled: true, group: 'בקרת הפעלה' },
  
  // Group 2: Navigation (ניווט)
  { action: 'rewind5', key: 'ArrowRight', description: 'קפוץ אחורה 5 שניות', enabled: true, group: 'ניווט' },
  { action: 'forward5', key: 'ArrowLeft', description: 'קפוץ קדימה 5 שניות', enabled: true, group: 'ניווט' },
  { action: 'rewind2_5', key: 'Shift+ArrowRight', description: 'קפוץ אחורה 2.5 שניות', enabled: true, group: 'ניווט' },
  { action: 'forward2_5', key: 'Shift+ArrowLeft', description: 'קפוץ קדימה 2.5 שניות', enabled: true, group: 'ניווט' },
  { action: 'jumpToStart', key: 'Home', description: 'קפוץ להתחלה', enabled: true, group: 'ניווט' },
  { action: 'jumpToEnd', key: 'End', description: 'קפוץ לסוף', enabled: true, group: 'ניווט' },
  
  // Group 3: Volume & Speed (עוצמה ומהירות)
  { action: 'volumeUp', key: 'ArrowUp', description: 'הגבר עוצמה', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'volumeDown', key: 'ArrowDown', description: 'הנמך עוצמה', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'mute', key: 'm', description: 'השתק/בטל השתקה', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'speedUp', key: '=', description: 'הגבר מהירות', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'speedDown', key: '-', description: 'הנמך מהירות', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'speedReset', key: '0', description: 'אפס מהירות', enabled: true, group: 'עוצמה ומהירות' },
  
  // Group 4: Work Modes (מצבי עבודה) - ordered by tabs like original
  { action: 'toggleShortcuts', key: 'Ctrl+Shift+s', description: 'הפעל/כבה קיצורים', enabled: true, group: 'מצבי עבודה' },
  { action: 'togglePedal', key: 'p', description: 'הפעל/כבה דוושה', enabled: true, group: 'מצבי עבודה' },
  { action: 'toggleAutoDetect', key: 'a', description: 'הפעל/כבה זיהוי אוטומטי', enabled: true, group: 'מצבי עבודה' },
  { action: 'toggleMode', key: 'Ctrl+m', description: 'החלף מצב רגיל/משופר', enabled: true, group: 'מצבי עבודה' },
  
  // Group 5: Settings (הגדרות)
  { action: 'toggleSettings', key: 's', description: 'פתח הגדרות', enabled: true, group: 'הגדרות' },
];

export default function KeyboardShortcuts({ shortcuts, enabled, onAction }: KeyboardShortcutsProps) {
  const activeShortcuts = useRef<Map<string, KeyboardShortcut>>(new Map());
  const isPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Build active shortcuts map
    activeShortcuts.current.clear();
    shortcuts.forEach(shortcut => {
      if (shortcut.enabled) {
        activeShortcuts.current.set(normalizeKey(shortcut.key), shortcut);
      }
    });
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in text editor
      const activeElement = e.target as HTMLElement;
      const inTextEditor = 
        activeElement instanceof HTMLInputElement || 
        activeElement instanceof HTMLTextAreaElement ||
        activeElement.contentEditable === 'true' ||
        activeElement.closest('.transcription-textarea') ||
        activeElement.closest('.text-editor-container') ||
        activeElement.closest('.transcription-text');
      
      // Check if this is a key combination (not just a single key)
      const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
      
      // Check if it's an F-key
      const isFKey = e.key.startsWith('F') && e.key.length <= 3;
      
      // Check if it's a numpad key
      const isNumpadKey = e.code && e.code.startsWith('Numpad');
      
      // Special: Shift+Numpad should ALWAYS work, even in text editor
      const isShiftNumpad = e.shiftKey && isNumpadKey;
      
      // Block single keys in text editor (except F-keys, numpad, combinations)
      if (inTextEditor && !hasModifier && !isFKey && !isNumpadKey && !isShiftNumpad) {
        return; // Block single keys that would type characters
      }

      const key = buildKeyString(e);
      
      // Prevent key repeat
      if (isPressed.current.has(key)) {
        return;
      }
      isPressed.current.add(key);

      const shortcut = activeShortcuts.current.get(key);
      if (shortcut && shortcut.enabled) {
        e.preventDefault();
        e.stopPropagation();
        onAction(shortcut.action);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = buildKeyString(e);
      isPressed.current.delete(key);
    };

    const buildKeyString = (e: KeyboardEvent): string => {
      const parts: string[] = [];
      
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');
      
      // Handle special keys
      let key = e.key;
      if (key === ' ') key = 'Space';
      if (key === 'ArrowLeft') key = 'ArrowLeft';
      if (key === 'ArrowRight') key = 'ArrowRight';
      if (key === 'ArrowUp') key = 'ArrowUp';
      if (key === 'ArrowDown') key = 'ArrowDown';
      
      // Don't add modifier keys themselves
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(key);
      }
      
      return parts.join('+');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      isPressed.current.clear();
    };
  }, [enabled, onAction]);

  return null; // This component doesn't render anything
}

// Helper function to normalize key strings for comparison
function normalizeKey(key: string): string {
  // Normalize space representations
  if (key === ' ' || key === 'Space' || key === 'רווח') {
    return 'Space';
  }
  
  // Normalize arrow keys (handle RTL labels)
  if (key === '→' || key === 'ArrowRight') return 'ArrowRight';
  if (key === '←' || key === 'ArrowLeft') return 'ArrowLeft';
  if (key === '↑' || key === 'ArrowUp') return 'ArrowUp';
  if (key === '↓' || key === 'ArrowDown') return 'ArrowDown';
  
  // Normalize escape
  if (key === 'Esc' || key === 'Escape') return 'Escape';
  
  // Handle Shift combinations
  if (key.includes('Shift+→')) return 'Shift+ArrowRight';
  if (key.includes('Shift+←')) return 'Shift+ArrowLeft';
  
  return key;
}