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
  { action: 'mute', key: 'u', description: 'השתק/בטל השתקה', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'speedUp', key: '=', description: 'הגבר מהירות', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'speedDown', key: '-', description: 'הנמך מהירות', enabled: true, group: 'עוצמה ומהירות' },
  { action: 'speedReset', key: '0', description: 'אפס מהירות', enabled: true, group: 'עוצמה ומהירות' },
  
  // Group 4: Mark Navigation (ניווט סימונים)
  { action: 'previousMark', key: 'Alt+ArrowRight', description: 'סימון קודם', enabled: true, group: 'ניווט סימונים' },
  { action: 'nextMark', key: 'Alt+ArrowLeft', description: 'סימון הבא', enabled: true, group: 'ניווט סימונים' },
  { action: 'cyclePlaybackMode', key: 'Ctrl+p', description: 'החלף מצב הפעלה', enabled: true, group: 'ניווט סימונים' },
  { action: 'loopCurrentMark', key: 'l', description: 'לולאה בסימון נוכחי', enabled: true, group: 'ניווט סימונים' },
  { action: 'cycleMarkFilter', key: 'f', description: 'החלף סינון סימונים', enabled: true, group: 'ניווט סימונים' },
  
  // Group 5: Work Modes (מצבי עבודה) - ordered by tabs like original
  { action: 'toggleShortcuts', key: 'Ctrl+Shift+s', description: 'הפעל/כבה קיצורים', enabled: true, group: 'מצבי עבודה' },
  { action: 'togglePedal', key: 'p', description: 'הפעל/כבה דוושה', enabled: true, group: 'מצבי עבודה' },
  { action: 'toggleAutoDetect', key: 'a', description: 'הפעל/כבה זיהוי אוטומטי', enabled: true, group: 'מצבי עבודה' },
  { action: 'toggleMode', key: 'Ctrl+m', description: 'החלף מצב רגיל/משופר', enabled: true, group: 'מצבי עבודה' },
  
  // Group 6: Settings (הגדרות)
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
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in ANY input field (not just text editor)
      const activeElement = e.target as HTMLElement;
      
      // If we're in ANY input/textarea that's not a transcription text area, let it handle the key
      const inNonTranscriptionInput = 
        (activeElement instanceof HTMLInputElement && !activeElement.closest('.transcription-textarea')) ||
        (activeElement instanceof HTMLTextAreaElement && !activeElement.closest('.transcription-textarea'));
      
      // Check if it's an F-key, Numpad key, or combination key FIRST
      const isFKey = e.key.startsWith('F') && e.key.length <= 3 && e.key.length >= 2;
      const isNumpadKey = e.code && e.code.startsWith('Numpad');
      const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
      
      // Allow F-keys, Numpad keys, and combination keys through even in non-transcription inputs
      if (inNonTranscriptionInput && !isFKey && !isNumpadKey && !hasModifier) {
        return; // Block everything EXCEPT F-keys, Numpad keys, and combinations
      }
      
      const inTextEditor = 
        activeElement.contentEditable === 'true' ||
        activeElement.closest('.transcription-textarea') ||
        activeElement.closest('.text-editor-container') ||
        activeElement.closest('.transcription-text') ||
        activeElement.closest('.block-text') ||
        activeElement.classList.contains('block-text');
      
      // Build the key string first to check if it's a registered shortcut
      const key = buildKeyString(e);
      const shortcut = activeShortcuts.current.get(key);
      
      // isFKey, isNumpadKey, and hasModifier already declared above for early check
      
      // Always log key presses for debugging
      console.log('KEY DEBUG:', {
        key: e.key,
        code: e.code,
        keyString: key,
        hasShortcut: !!shortcut,
        shortcutAction: shortcut?.action,
        inTextEditor,
        enabled,
        isFKey,
        isNumpadKey,
        hasModifier,
        activeElement: activeElement.tagName,
        contentEditable: activeElement.contentEditable,
        classList: activeElement.classList.toString()
      });
      
      // Prevent key repeat
      if (isPressed.current.has(key)) {
        return;
      }
      
      // Special handling for END and HOME keys in text editor - they should work normally
      const isNavigationKey = ['End', 'Home'].includes(e.key);
      
      // Check if this key has a shortcut assigned
      if (shortcut && shortcut.enabled) {
        // Special keys (F-keys, Numpad, combinations) that should work in text editor
        const isSpecialKey = isFKey || isNumpadKey || hasModifier;
        
        // Check if this is a toggle action (these always work)
        const toggleActions = ['toggleShortcuts', 'toggleSettings', 'togglePedal', 'toggleAutoDetect', 'toggleMode'];
        const isToggleAction = toggleActions.includes(shortcut.action);
        
        // Determine if we should execute this shortcut
        let shouldExecute = false;
        
        if (inTextEditor) {
          // In text editor: only special keys (F-keys, numpad, combinations) or toggle actions work
          shouldExecute = isSpecialKey || isToggleAction;
          
          // Exception: navigation keys (Home/End) should not trigger shortcuts in text editor
          if (isNavigationKey && !hasModifier) {
            shouldExecute = false;
          }
        } else {
          // Outside text editor: respect global enabled state or allow toggle actions
          shouldExecute = enabled || isToggleAction;
        }
        
        console.log('SHORTCUT EXECUTION CHECK:', {
          action: shortcut.action,
          isSpecialKey,
          isToggleAction,
          shouldExecute,
          inTextEditor,
          enabled,
          isNavigationKey
        });
        
        if (shouldExecute) {
          isPressed.current.add(key);
          e.preventDefault();
          e.stopPropagation();
          console.log('EXECUTING SHORTCUT:', shortcut.action);
          onAction(shortcut.action);
          return;
        }
      }
      
      // If we're in text editor and it's a regular single key without a special shortcut, let it type
      if (inTextEditor) {
        // Block only if: it's not a special key AND it has a shortcut (but shouldn't execute)
        if (!isFKey && !isNumpadKey && !hasModifier && shortcut && shortcut.enabled) {
          // This is a regular key with a shortcut - block it from typing
          e.preventDefault();
          e.stopPropagation();
        }
        // Otherwise let the key type normally
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
      
      // Convert to lowercase for letter keys (to handle capital letters)
      if (key.length === 1 && /[A-Z]/.test(key)) {
        key = key.toLowerCase();
      }
      
      // Handle numpad keys - keep the full Numpad code for proper identification
      if (e.code && e.code.startsWith('Numpad')) {
        // Use the code directly (e.g., "Numpad0", "Numpad1", "NumpadAdd")
        // This allows users to assign Numpad keys in settings and have them work properly
        key = e.code;
      }
      
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

    // Use capture phase to get events before other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
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
  
  // Convert single capital letters to lowercase
  if (key.length === 1 && /[A-Z]/.test(key)) {
    return key.toLowerCase();
  }
  
  // Handle Ctrl/Alt/Shift combinations with capital letters
  const parts = key.split('+');
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 1 && /[A-Z]/.test(lastPart)) {
      parts[parts.length - 1] = lastPart.toLowerCase();
      return parts.join('+');
    }
  }
  
  return key;
}