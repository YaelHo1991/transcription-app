/**
 * Service for persisting editor preferences to localStorage
 * Saves user preferences like font size, font family, view modes, etc.
 */

export interface EditorPreferences {
  // Toolbar settings
  fontSize?: number;
  fontFamily?: 'default' | 'david';
  blockViewEnabled?: boolean;
  navigationMode?: boolean;
  
  // Tab configurations (stored per tab ID)
  tabConfigs?: {
    [tabId: string]: {
      modeEnabled?: boolean;
      pauseOnTabSwitch?: boolean;
    };
  };
}

const PREFERENCES_KEY_PREFIX = 'editorPreferences_';
const GLOBAL_PREFERENCES_KEY = 'globalEditorPreferences';

export class EditorPreferencesService {
  /**
   * Save preferences for a specific transcription
   */
  static saveTranscriptionPreferences(transcriptionId: string, preferences: EditorPreferences): void {
    try {
      const key = `${PREFERENCES_KEY_PREFIX}${transcriptionId}`;
      const existing = this.getTranscriptionPreferences(transcriptionId);
      const updated = { ...existing, ...preferences };
      
      // Merge tab configs if they exist
      if (existing.tabConfigs && preferences.tabConfigs) {
        updated.tabConfigs = { ...existing.tabConfigs, ...preferences.tabConfigs };
      }
      
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save editor preferences:', error);
    }
  }

  /**
   * Get preferences for a specific transcription
   */
  static getTranscriptionPreferences(transcriptionId: string): EditorPreferences {
    try {
      const key = `${PREFERENCES_KEY_PREFIX}${transcriptionId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load editor preferences:', error);
    }
    return {};
  }

  /**
   * Save global preferences (applies to all transcriptions)
   */
  static saveGlobalPreferences(preferences: EditorPreferences): void {
    try {
      const existing = this.getGlobalPreferences();
      const updated = { ...existing, ...preferences };
      localStorage.setItem(GLOBAL_PREFERENCES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save global preferences:', error);
    }
  }

  /**
   * Get global preferences
   */
  static getGlobalPreferences(): EditorPreferences {
    try {
      const stored = localStorage.getItem(GLOBAL_PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load global preferences:', error);
    }
    return {};
  }

  /**
   * Save tab-specific configuration
   */
  static saveTabConfig(
    transcriptionId: string, 
    tabId: string, 
    config: { modeEnabled?: boolean; pauseOnTabSwitch?: boolean }
  ): void {
    try {
      const prefs = this.getTranscriptionPreferences(transcriptionId);
      if (!prefs.tabConfigs) {
        prefs.tabConfigs = {};
      }
      prefs.tabConfigs[tabId] = { ...prefs.tabConfigs[tabId], ...config };
      this.saveTranscriptionPreferences(transcriptionId, prefs);
    } catch (error) {
      console.error('Failed to save tab config:', error);
    }
  }

  /**
   * Get tab-specific configuration
   */
  static getTabConfig(
    transcriptionId: string, 
    tabId: string
  ): { modeEnabled?: boolean; pauseOnTabSwitch?: boolean } {
    try {
      const prefs = this.getTranscriptionPreferences(transcriptionId);
      return prefs.tabConfigs?.[tabId] || {};
    } catch (error) {
      console.error('Failed to load tab config:', error);
      return {};
    }
  }

  /**
   * Clear preferences for a specific transcription
   */
  static clearTranscriptionPreferences(transcriptionId: string): void {
    try {
      const key = `${PREFERENCES_KEY_PREFIX}${transcriptionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear preferences:', error);
    }
  }

  /**
   * Clear all preferences
   */
  static clearAllPreferences(): void {
    try {
      // Clear global preferences
      localStorage.removeItem(GLOBAL_PREFERENCES_KEY);
      
      // Clear all transcription-specific preferences
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(PREFERENCES_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear all preferences:', error);
    }
  }

  /**
   * Merge preferences with defaults
   */
  static mergeWithDefaults(preferences: EditorPreferences): EditorPreferences {
    return {
      fontSize: preferences.fontSize ?? 16,
      fontFamily: preferences.fontFamily ?? 'default',
      blockViewEnabled: preferences.blockViewEnabled ?? true,
      navigationMode: preferences.navigationMode ?? false,
      tabConfigs: preferences.tabConfigs ?? {},
    };
  }
}