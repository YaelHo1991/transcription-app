/**
 * Settings management utility functions for the MediaPlayer component
 */

import { KeyboardShortcut } from '../types';
import { defaultShortcuts } from '../components/KeyboardShortcuts';

/**
 * MediaPlayer settings interface
 */
export interface MediaPlayerSettings {
  shortcuts: KeyboardShortcut[];
  shortcutsEnabled: boolean;
  rewindOnPause: { enabled: boolean; amount: number };
  pedalEnabled?: boolean;
  autoDetectEnabled?: boolean;
  autoDetectMode?: 'regular' | 'enhanced';
  volume?: number;
  playbackRate?: number;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: MediaPlayerSettings = {
  shortcuts: defaultShortcuts,
  shortcutsEnabled: true,
  rewindOnPause: { enabled: false, amount: 0.5 },
  pedalEnabled: false,
  autoDetectEnabled: false,
  autoDetectMode: 'regular',
  volume: 100,
  playbackRate: 1
};

/**
 * Load settings from localStorage
 */
export function loadSettings(): MediaPlayerSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  const savedSettings = localStorage.getItem('mediaPlayerSettings');
  if (!savedSettings) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(savedSettings);
    
    // Merge shortcuts with defaults to ensure new shortcuts are added
    if (parsed.shortcuts) {
      parsed.shortcuts = mergeShortcuts(parsed.shortcuts, defaultShortcuts);
    }
    
    // Merge with defaults to ensure all properties exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
  } catch (error) {
    console.error('Failed to parse saved settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: Partial<MediaPlayerSettings>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentSettings = loadSettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings
    };
    
    localStorage.setItem('mediaPlayerSettings', JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Merge saved shortcuts with defaults
 * Preserves user customizations while adding new shortcuts
 */
export function mergeShortcuts(
  savedShortcuts: KeyboardShortcut[],
  defaultShortcuts: KeyboardShortcut[]
): KeyboardShortcut[] {
  // Create a map of saved shortcuts by action for deduplication
  const savedShortcutsMap = new Map(
    savedShortcuts.map(s => [s.action, s])
  );
  
  // Use defaults as base, but preserve saved customizations
  const mergedShortcuts = defaultShortcuts.map(defaultShortcut => {
    const saved = savedShortcutsMap.get(defaultShortcut.action);
    if (saved) {
      // Preserve user's key customization
      return { ...defaultShortcut, key: saved.key };
    }
    return defaultShortcut;
  });
  
  // Add any saved shortcuts that don't exist in defaults (user custom actions)
  savedShortcuts.forEach(saved => {
    if (!defaultShortcuts.find(d => d.action === saved.action)) {
      mergedShortcuts.push(saved);
    }
  });
  
  return mergedShortcuts;
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem('mediaPlayerSettings');
}