import {
  ShortcutData,
  UserQuota,
  ProcessTextResult,
  ShortcutAPIResponse,
  AddShortcutRequest,
  ShortcutCategory
} from '../types/shortcuts';
import { ShortcutCache, getShortcutCache } from './ShortcutCache';
import { getApiUrl } from '@/utils/api';

/**
 * ShortcutManager - Manages text shortcuts for the TextEditor
 * Handles both system and user shortcuts with real-time text processing
 * Now with optimized caching for high-performance operations
 */
export class ShortcutManager {
  private shortcuts: Map<string, ShortcutData> = new Map();
  private categories: ShortcutCategory[] = [];
  private quota: UserQuota = { max: 100, used: 0 };
  private userId?: string;
  private token?: string;
  private apiUrl: string = '/api/transcription/shortcuts';
  private lastFetchTime: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes cache
  private cache: ShortcutCache;
  private isLoadingPublic: boolean = false;
  private isLoadingUser: boolean = false;
  private publicShortcutsLoaded: boolean = false;
  
  // Hebrew prefixes that can combine with shortcuts
  private readonly hebrewPrefixes = ['ו', 'ה', 'ש', 'וש', 'כש', 'ב', 'ל', 'מ', 'כ', 'מה'];
  
  // Special handling for English words category
  private readonly englishWordsCategory = 'english';
  
  constructor(apiUrl?: string) {
    if (apiUrl) {
      this.apiUrl = apiUrl;
    }
    // Initialize high-performance cache
    this.cache = getShortcutCache(2000); // Support up to 2000 shortcuts in cache
  }
  
  /**
   * Initialize the manager with user authentication
   */
  async initialize(userId: string, token: string): Promise<void> {
    this.userId = userId;
    this.token = token;
    await this.loadShortcuts();
  }

  /**
   * Set authentication token (for use when token is obtained later)
   */
  setToken(token: string): void {
    this.token = token;
  }
  
  /**
   * Load public system shortcuts without authentication
   * This is used to load system shortcuts for all users
   */
  async loadPublicShortcuts(): Promise<void> {
    // Skip if already loaded or currently loading
    if (this.publicShortcutsLoaded || this.isLoadingPublic) {
      console.log('[ShortcutManager] Public shortcuts already loaded or loading, skipping...');
      return;
    }

    this.isLoadingPublic = true;

    try {
      const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? '' // Use same origin in production
        : getApiUrl();

      const response = await fetch(baseUrl + '/api/transcription/shortcuts/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.warn('[ShortcutManager] Network error loading public shortcuts:', error.message);
        return null;
      });

      if (!response) {
        // Network error - continue without public shortcuts
        console.warn('[ShortcutManager] Could not load public shortcuts - continuing without them');
        return;
      }

      if (!response.ok) {
        console.warn('Failed to load public shortcuts:', response.statusText);
        return;
      }
      
      const data: ShortcutAPIResponse = await response.json();
      
      // Clear and rebuild shortcuts map with system shortcuts only
      this.shortcuts.clear();
      const cacheData: Array<[string, any]> = [];
      
      data.shortcuts.forEach(([shortcut, shortcutData]) => {
        this.shortcuts.set(shortcut, shortcutData);
        // Prepare cache data
        cacheData.push([shortcut, {
          expansion: shortcutData.expansion,
          category: shortcutData.category,
          description: shortcutData.description,
          source: shortcutData.source
        }]);
      });
      
      // Bulk load into cache for optimal performance
      this.cache.bulkLoad(cacheData);
      
      // Update categories (quota will be updated when user logs in)
      this.categories = data.categories || [];
      this.lastFetchTime = Date.now();
      this.publicShortcutsLoaded = true;
      
      console.log('ShortcutManager: Loaded ' + this.shortcuts.size + ' public shortcuts')
    } catch (error) {
      console.error('ShortcutManager: Error loading public shortcuts:', error);
      // Don't throw - we can still work without shortcuts
    } finally {
      this.isLoadingPublic = false;
    }
  }
  
  /**
   * Load shortcuts from the API
   */
  async loadShortcuts(forceRefresh: boolean = false): Promise<void> {
    // Skip if already loading
    if (this.isLoadingUser) {
      console.log('[ShortcutManager] User shortcuts already loading, skipping...');
      return;
    }

    // Check cache validity
    const now = Date.now();
    if (!forceRefresh && (now - this.lastFetchTime) < this.cacheTimeout) {
      console.log('[ShortcutManager] Using cached shortcuts (cache valid for', Math.round((this.cacheTimeout - (now - this.lastFetchTime)) / 1000), 'more seconds)');
      return; // Use cached data
    }

    if (!this.token) {
      console.warn('ShortcutManager: No authentication token - skipping user shortcuts');
      return;
    }

    console.log('[ShortcutManager] Making API request to:', this.apiUrl);
    console.log('[ShortcutManager] Using token:', this.token.substring(0, 20) + '...');

    this.isLoadingUser = true;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + this.token,
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.warn('[ShortcutManager] Network error loading shortcuts:', error.message);
        return null;
      });

      if (!response) {
        console.warn('[ShortcutManager] No response from server - network error');
        // Network error - just use existing shortcuts
        return;
      }

      console.log('[ShortcutManager] API Response status:', response.status);

      if (!response.ok) {
        console.warn('[ShortcutManager] Failed to load shortcuts:', response.status, response.statusText);
        const errorText = await response.text();
        console.warn('[ShortcutManager] Error response:', errorText);
        return;
      }
      
      const data: ShortcutAPIResponse = await response.json();
      
      // Keep existing system shortcuts and add/update with user shortcuts
      // First, remove old user shortcuts
      const systemShortcuts = new Map<string, ShortcutData>();
      this.shortcuts.forEach((data, shortcut) => {
        if (data.source === 'system') {
          systemShortcuts.set(shortcut, data);
        }
      });
      
      // Clear and rebuild with system shortcuts first
      this.shortcuts.clear();
      systemShortcuts.forEach((data, shortcut) => {
        this.shortcuts.set(shortcut, data);
      });
      
      const cacheData: Array<[string, any]> = [];
      
      // Add all shortcuts from the API (system + user)
      // Check if shortcuts is an array
      if (Array.isArray(data.shortcuts)) {
        console.log('[ShortcutManager] Loading', data.shortcuts.length, 'shortcuts from API');

        // Log user shortcuts specifically
        const userShortcuts = data.shortcuts.filter(s => s.source === 'user');
        console.log('[ShortcutManager] Found', userShortcuts.length, 'user shortcuts:', userShortcuts.map(s => s.shortcut));

        data.shortcuts.forEach((shortcutObj) => {
          // Handle the object format from the API
          const shortcut = shortcutObj.shortcut;
          const shortcutData = {
            expansion: shortcutObj.expansion,
            category: shortcutObj.category || 'custom',
            source: shortcutObj.source || 'user',
            description: shortcutObj.description,
            language: shortcutObj.language || 'he'
          };

          this.shortcuts.set(shortcut, shortcutData);
          // Prepare cache data
          cacheData.push([shortcut, shortcutData]);
        });
      } else {
        console.warn('[ShortcutManager] Unexpected data format - shortcuts is not an array:', data);
      }
      
      // Bulk load into cache for optimal performance
      this.cache.bulkLoad(cacheData);
      
      // Update quota and categories
      this.quota = data.quota;
      this.categories = data.categories || [];
      this.lastFetchTime = now;
      
      console.log('ShortcutManager: Loaded ' + this.shortcuts.size + ' shortcuts (Cache hit rate: ' + (this.cache.getStats().hitRate * 100).toFixed(1) + '%)')
    } catch (error) {
      console.error('ShortcutManager: Error loading shortcuts:', error);
      // Don't throw - we can still work without user shortcuts
    } finally {
      this.isLoadingUser = false;
    }
  }
  
  /**
   * Process text for shortcuts at the current cursor position
   * Optimized with cache for high-performance lookups
   */
  processText(text: string, cursorPosition: number): ProcessTextResult {
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);

    // Debug logging
    console.log('[ShortcutManager] Processing text:', beforeCursor);

    // First, try to match shortcuts exactly as they are (including shortcuts that contain punctuation)
    console.log('[ShortcutManager] 🔍 DIRECT MATCH: Trying direct match for:', beforeCursor);
    const result = this.tryMatchShortcuts(beforeCursor, afterCursor, text, cursorPosition, '');
    if (result.expanded) {
      console.log('[ShortcutManager] ✅ DIRECT SUCCESS: Matched shortcut directly:', result.expandedShortcut);
      return result;
    } else {
      console.log('[ShortcutManager] ❌ DIRECT FAIL: No direct match found');
    }

    // If no direct match, check if text ends with punctuation and try matching without it
    // Define punctuation marks that can appear after shortcuts
    // Including Hebrew apostrophe (׳) for shortcuts like וכו׳
    const punctuationMarks = [',', '.', '!', '?', ':', ';', ')', ']', '}', '"', '-', '\\', '|', '%', '=', '׳', "'"];

    for (const punct of punctuationMarks) {
      if (beforeCursor.endsWith(punct)) {
        const textWithoutPunct = beforeCursor.slice(0, -1);
        console.log('[ShortcutManager] 🔍 PUNCT DEBUG: Found punctuation:', punct);
        console.log('[ShortcutManager] 🔍 PUNCT DEBUG: Text with punct:', beforeCursor);
        console.log('[ShortcutManager] 🔍 PUNCT DEBUG: Text without punct:', textWithoutPunct);
        console.log('[ShortcutManager] 🔍 PUNCT DEBUG: Available shortcuts containing text:',
          Array.from(this.shortcuts.keys()).filter(s => textWithoutPunct.includes(s) || s.includes(textWithoutPunct))
        );

        const resultWithoutPunct = this.tryMatchShortcuts(textWithoutPunct, afterCursor, text, cursorPosition - 1, punct);
        if (resultWithoutPunct.expanded) {
          console.log('[ShortcutManager] ✅ PUNCT SUCCESS: Matched after removing punctuation:', resultWithoutPunct.expandedShortcut);
          // Adjust positions for the punctuation
          return {
            ...resultWithoutPunct,
            cursorPosition: resultWithoutPunct.cursorPosition + 1
          };
        } else {
          console.log('[ShortcutManager] ❌ PUNCT FAIL: No match found for:', textWithoutPunct);
        }
        break; // Only check the first punctuation mark found
      }
    }

    // No expansion needed
    return {
      text,
      cursorPosition,
      expanded: false
    };
  }

  /**
   * Try to match shortcuts in the given text
   */
  private tryMatchShortcuts(
    textToCheck: string,
    afterCursor: string,
    fullText: string,
    originalCursorPos: number,
    trailingPunctuation: string
  ): ProcessTextResult {

    // Skip cache for now - it's not handling prefixes correctly
    // TODO: Update cache to handle prefix transformations
    // const cacheMatch = this.cache.findMatch(textToCheck);
    // if (cacheMatch) {
    //   const startPos = originalCursorPos - cacheMatch.shortcut.length - trailingPunctuation.length;
    //   const expansionWithPunct = cacheMatch.expansion + trailingPunctuation;
    //   const newText = fullText.substring(0, startPos) + expansionWithPunct + afterCursor;
    //   const newCursorPos = startPos + expansionWithPunct.length;

    //   return {
    //     text: newText,
    //     cursorPosition: newCursorPos,
    //     expanded: true,
    //     expandedShortcut: cacheMatch.shortcut + trailingPunctuation,
    //     expandedTo: expansionWithPunct
    //   };
    // }
    
    // Fall back to full search for special cases (Hebrew variations, etc.)
    // Sort shortcuts by length (longest first) for proper matching
    const sortedShortcuts = Array.from(this.shortcuts.keys())
      .sort((a, b) => b.length - a.length);
    
    // Debug: Log what we're checking
    if (textToCheck.includes('פייסבוק')) {
      console.log('[ShortcutManager] Checking text:', textToCheck);
      console.log('[ShortcutManager] Available shortcuts:', sortedShortcuts.filter(s => s.includes('פייסבוק')));
    }
    
    // FIRST: Check with Hebrew prefixes to catch prefixed versions before base shortcuts
    for (const prefix of this.hebrewPrefixes) {
      for (const shortcut of sortedShortcuts) {
        const prefixedShortcut = prefix + shortcut;
        if (textToCheck.endsWith(prefixedShortcut)) {
          const shortcutData = this.shortcuts.get(shortcut);
          if (!shortcutData) continue;
          
          let expansion = shortcutData.expansion;
          
          // Special handling for English words with prefix
          if (shortcutData.category === this.englishWordsCategory) {
            // For English words, add "- " after the prefix
            // Example: ופייסבוק -> ו- Facebook
            console.log('[ShortcutManager] English word with prefix:', prefix, shortcut, '→', prefix + '- ' + expansion);
            expansion = prefix + '- ' + expansion;
          } else if (prefix === 'ה' && expansion.startsWith('ה')) {
            // Keep single ה for Hebrew words starting with ה
            expansion = expansion;
          } else {
            expansion = prefix + expansion;
          }
          
          // Add punctuation back if present
          const expansionWithPunct = expansion + trailingPunctuation;
          const startPos = originalCursorPos - prefixedShortcut.length - trailingPunctuation.length;
          const newText = fullText.substring(0, startPos) + expansionWithPunct + afterCursor;
          const newCursorPos = startPos + expansionWithPunct.length;
          
          return {
            text: newText,
            cursorPosition: newCursorPos,
            expanded: true,
            expandedShortcut: prefixedShortcut + trailingPunctuation,
            expandedTo: expansionWithPunct,
            // Undo metadata
            processed: true,
            originalText: fullText,
            expansionStart: startPos,
            expansionEnd: startPos + expansionWithPunct.length
          };
        }
      }
    }
    
    // THEN: Check each shortcut (including variations)
    for (const shortcut of sortedShortcuts) {
      const shortcutData = this.shortcuts.get(shortcut);
      if (!shortcutData) continue;
      
      // Check for special variations with ה in the middle (for multi-word expansions)
      // Example: ב'ס -> בית ספר, ב'הס -> בית הספר
      if (shortcut.includes("'") && shortcutData.expansion.includes(' ')) {
        const shortcutWithHe = shortcut.replace("'", "'ה");
        if (textToCheck.endsWith(shortcutWithHe)) {
          const expansionWithHe = this.addHeToMultiWord(shortcutData.expansion);
          const startPos = originalCursorPos - shortcutWithHe.length;
          const newText = fullText.substring(0, startPos) + expansionWithHe + afterCursor;
          const newCursorPos = startPos + expansionWithHe.length;
          
          return {
            text: newText,
            cursorPosition: newCursorPos,
            expanded: true,
            expandedShortcut: shortcutWithHe,
            expandedTo: expansionWithHe,
            // Undo metadata
            processed: true,
            originalText: fullText,
            expansionStart: startPos,
            expansionEnd: startPos + expansionWithHe.length
          };
        }
        
        // Check with prefix + ה variation
        // Example: וב'הס -> ובית הספר
        for (const prefix of this.hebrewPrefixes) {
          const prefixedWithHe = prefix + shortcutWithHe;
          if (textToCheck.endsWith(prefixedWithHe)) {
            const expansionWithHe = prefix + this.addHeToMultiWord(shortcutData.expansion);
            const startPos = originalCursorPos - prefixedWithHe.length;
            const newText = fullText.substring(0, startPos) + expansionWithHe + afterCursor;
            const newCursorPos = startPos + expansionWithHe.length;
            
            return {
              text: newText,
              cursorPosition: newCursorPos,
              expanded: true,
              expandedShortcut: prefixedWithHe,
              expandedTo: expansionWithHe,
              // Undo metadata
              processed: true,
              originalText: fullText,
              expansionStart: startPos,
              expansionEnd: startPos + expansionWithHe.length
            };
          }
        }
      }
      
      // Regular shortcut check (with or without punctuation)
      if (textToCheck.endsWith(shortcut)) {
        let expansion = shortcutData.expansion;
        
        // Special handling for English words
        if (shortcutData.category === this.englishWordsCategory) {
          // English words get special formatting
          expansion = expansion; // Keep as is
        }
        
        // Add punctuation back if present
        const expansionWithPunct = expansion + trailingPunctuation;
        const startPos = originalCursorPos - shortcut.length - trailingPunctuation.length;
        const newText = fullText.substring(0, startPos) + expansionWithPunct + afterCursor;
        const newCursorPos = startPos + expansionWithPunct.length;
        
        return {
          text: newText,
          cursorPosition: newCursorPos,
          expanded: true,
          expandedShortcut: shortcut + trailingPunctuation,
          expandedTo: expansionWithPunct,
          // Undo metadata
          processed: true,
          originalText: fullText,
          expansionStart: startPos,
          expansionEnd: startPos + expansionWithPunct.length
        };
      }
    }

    // No expansion needed
    return {
      text: fullText,
      cursorPosition: originalCursorPos,
      expanded: false
    };
  }
  
  /**
   * Add ה to the second word in multi-word expansions
   * Example: "בית ספר" -> "בית הספר"
   */
  private addHeToMultiWord(expansion: string): string {
    const words = expansion.split(' ');
    if (words.length >= 2) {
      // Add ה to the second word if it doesn't already have it
      if (!words[1].startsWith('ה')) {
        words[1] = 'ה' + words[1];
      }
      return words.join(' ');
    }
    return expansion;
  }
  
  /**
   * Add a personal shortcut for the user
   */
  async addPersonalShortcut(shortcut: string, expansion: string, description?: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    if (this.quota.used >= this.quota.max) {
      throw new Error('You\'ve reached your limit of ' + this.quota.max + ' personal shortcuts');
    }

    // Check if shortcut already exists
    if (this.shortcuts.has(shortcut)) {
      const existing = this.shortcuts.get(shortcut);
      if (existing?.source === 'system') {
        throw new Error('Cannot override system shortcuts');
      }
      // Update existing user shortcut or override system shortcut
    }
    
    const request: AddShortcutRequest = {
      shortcut,
      expansion,
      description
    };
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add shortcut');
    }
    
    // Update local cache
    this.shortcuts.set(shortcut, {
      expansion,
      source: 'user',
      description
    });
    this.quota.used++;
  }
  
  /**
   * Delete a personal shortcut
   */
  async deletePersonalShortcut(shortcut: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    
    const shortcutData = this.shortcuts.get(shortcut);
    if (!shortcutData) {
      throw new Error('Shortcut not found');
    }
    
    if (shortcutData.source === 'system') {
      throw new Error('Cannot delete system shortcuts');
    }
    
    const response = await fetch(this.apiUrl + '/${encodeURIComponent(shortcut)}', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + this.token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete shortcut');
    }
    
    // Update local cache
    this.shortcuts.delete(shortcut);
    this.quota.used = Math.max(0, this.quota.used - 1);
  }
  
  /**
   * Update a personal shortcut
   */
  async updatePersonalShortcut(oldShortcut: string, newShortcut: string, expansion: string): Promise<void> {
    // Delete old and add new
    await this.deletePersonalShortcut(oldShortcut);
    await this.addPersonalShortcut(newShortcut, expansion);
  }
  
  /**
   * Get all shortcuts grouped by category
   */
  getShortcutsByCategory(): Map<string, Array<[string, ShortcutData]>> {
    const grouped = new Map<string, Array<[string, ShortcutData]>>();
    
    // Initialize categories
    this.categories.forEach(cat => {
      grouped.set(cat.name, []);
    });
    grouped.set('uncategorized', []);
    
    // Group shortcuts
    this.shortcuts.forEach((data, shortcut) => {
      const category = data.category || 'uncategorized';
      const categoryShortcuts = grouped.get(category) || [];
      categoryShortcuts.push([shortcut, data]);
      grouped.set(category, categoryShortcuts);
    });
    
    return grouped;
  }
  
  /**
   * Search shortcuts by text
   */
  searchShortcuts(query: string): Array<[string, ShortcutData]> {
    const results: Array<[string, ShortcutData]> = [];
    const lowerQuery = query.toLowerCase();
    
    this.shortcuts.forEach((data, shortcut) => {
      if (shortcut.toLowerCase().includes(lowerQuery) ||
          data.expansion.toLowerCase().includes(lowerQuery) ||
          data.description?.toLowerCase().includes(lowerQuery)) {
        results.push([shortcut, data]);
      }
    });
    
    return results;
  }
  
  /**
   * Get user quota information
   */
  getQuota(): UserQuota {
    return { ...this.quota };
  }
  
  /**
   * Get all shortcuts (for display)
   */
  getAllShortcuts(): Map<string, ShortcutData> {
    return this.shortcuts;
  }
  
  /**
   * Get personal shortcuts only
   */
  getPersonalShortcuts(): Map<string, ShortcutData> {
    const personal = new Map<string, ShortcutData>();
    this.shortcuts.forEach((data, shortcut) => {
      if (data.source === 'user') {
        personal.set(shortcut, data);
      }
    });
    return personal;
  }
  
  /**
   * Get system shortcuts only
   */
  getSystemShortcuts(): Map<string, ShortcutData> {
    const system = new Map<string, ShortcutData>();
    this.shortcuts.forEach((data, shortcut) => {
      if (data.source === 'system') {
        system.set(shortcut, data);
      }
    });
    return system;
  }
  
  /**
   * Check if a shortcut exists
   */
  hasShortcut(shortcut: string): boolean {
    return this.shortcuts.has(shortcut);
  }
  
  /**
   * Get a specific shortcut
   */
  getShortcut(shortcut: string): ShortcutData | undefined {
    return this.shortcuts.get(shortcut);
  }
  
  /**
   * Clear cache and force reload
   */
  async refresh(): Promise<void> {
    this.cache.clear();
    await this.loadShortcuts(true);
  }
  
  /**
   * Get cache performance statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    return this.cache.getStats();
  }
  
  /**
   * Pre-warm cache with most commonly used shortcuts
   */
  warmUpCache(commonShortcuts?: string[]): void {
    const defaultCommon = ['ע\'ד', 'ביהמ\'ש', 'ב\'ר', 'וכו\'', 'ד\'ר', 'פרופ\''];
    const toWarm = commonShortcuts || defaultCommon;
    this.cache.warmUp(toWarm);
  }
}