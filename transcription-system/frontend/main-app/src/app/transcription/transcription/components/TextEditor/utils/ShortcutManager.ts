import {
  ShortcutData,
  UserQuota,
  ProcessTextResult,
  ShortcutAPIResponse,
  AddShortcutRequest,
  ShortcutCategory
} from '../types/shortcuts';
import { ShortcutCache, getShortcutCache } from './ShortcutCache';

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
   * Load shortcuts from the API
   */
  async loadShortcuts(forceRefresh: boolean = false): Promise<void> {
    // Check cache validity
    const now = Date.now();
    if (!forceRefresh && (now - this.lastFetchTime) < this.cacheTimeout) {
      return; // Use cached data
    }
    
    if (!this.token) {
      console.error('ShortcutManager: No authentication token');
      return;
    }
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + this.token,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load shortcuts: ' + response.statusText);
      }
      
      const data: ShortcutAPIResponse = await response.json();
      
      // Clear and rebuild shortcuts map
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
      
      // Update quota and categories
      this.quota = data.quota;
      this.categories = data.categories || [];
      this.lastFetchTime = now;
      
      console.log('ShortcutManager: Loaded ' + this.shortcuts.size + ' shortcuts (Cache hit rate: ' + (this.cache.getStats().hitRate * 100).toFixed(1) + '%)')
    } catch (error) {
      console.error('ShortcutManager: Error loading shortcuts:', error);
    }
  }
  
  /**
   * Process text for shortcuts at the current cursor position
   * Optimized with cache for high-performance lookups
   */
  processText(text: string, cursorPosition: number): ProcessTextResult {
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // First, try cache lookup for fast matching
    const cacheMatch = this.cache.findMatch(beforeCursor);
    if (cacheMatch) {
      const startPos = cursorPosition - cacheMatch.shortcut.length;
      const newText = text.substring(0, startPos) + cacheMatch.expansion + afterCursor;
      const newCursorPos = startPos + cacheMatch.expansion.length;
      
      return {
        text: newText,
        cursorPosition: newCursorPos,
        expanded: true,
        expandedShortcut: cacheMatch.shortcut,
        expandedTo: cacheMatch.expansion
      };
    }
    
    // Fall back to full search for special cases (Hebrew variations, etc.)
    // Sort shortcuts by length (longest first) for proper matching
    const sortedShortcuts = Array.from(this.shortcuts.keys())
      .sort((a, b) => b.length - a.length);
    
    // Check each shortcut (including variations)
    for (const shortcut of sortedShortcuts) {
      const shortcutData = this.shortcuts.get(shortcut);
      if (!shortcutData) continue;
      
      // Check for special variations with ה in the middle (for multi-word expansions)
      // Example: ב'ס -> בית ספר, ב'הס -> בית הספר
      if (shortcut.includes("'") && shortcutData.expansion.includes(' ')) {
        const shortcutWithHe = shortcut.replace("'", "'ה");
        if (beforeCursor.endsWith(shortcutWithHe)) {
          const expansionWithHe = this.addHeToMultiWord(shortcutData.expansion);
          const startPos = cursorPosition - shortcutWithHe.length;
          const newText = text.substring(0, startPos) + expansionWithHe + afterCursor;
          const newCursorPos = startPos + expansionWithHe.length;
          
          return {
            text: newText,
            cursorPosition: newCursorPos,
            expanded: true,
            expandedShortcut: shortcutWithHe,
            expandedTo: expansionWithHe
          };
        }
        
        // Check with prefix + ה variation
        // Example: וב'הס -> ובית הספר
        for (const prefix of this.hebrewPrefixes) {
          const prefixedWithHe = prefix + shortcutWithHe;
          if (beforeCursor.endsWith(prefixedWithHe)) {
            const expansionWithHe = prefix + this.addHeToMultiWord(shortcutData.expansion);
            const startPos = cursorPosition - prefixedWithHe.length;
            const newText = text.substring(0, startPos) + expansionWithHe + afterCursor;
            const newCursorPos = startPos + expansionWithHe.length;
            
            return {
              text: newText,
              cursorPosition: newCursorPos,
              expanded: true,
              expandedShortcut: prefixedWithHe,
              expandedTo: expansionWithHe
            };
          }
        }
      }
      
      // Regular shortcut check
      if (beforeCursor.endsWith(shortcut)) {
        let expansion = shortcutData.expansion;
        
        // Special handling for English words
        if (shortcutData.category === this.englishWordsCategory) {
          // English words get special formatting
          expansion = expansion; // Keep as is
        }
        
        const startPos = cursorPosition - shortcut.length;
        const newText = text.substring(0, startPos) + expansion + afterCursor;
        const newCursorPos = startPos + expansion.length;
        
        return {
          text: newText,
          cursorPosition: newCursorPos,
          expanded: true,
          expandedShortcut: shortcut,
          expandedTo: expansion
        };
      }
    }
    
    // Check with Hebrew prefixes
    for (const prefix of this.hebrewPrefixes) {
      for (const shortcut of sortedShortcuts) {
        const prefixedShortcut = prefix + shortcut;
        if (beforeCursor.endsWith(prefixedShortcut)) {
          const shortcutData = this.shortcuts.get(shortcut);
          if (!shortcutData) continue;
          
          let expansion = shortcutData.expansion;
          
          // Special handling for English words with prefix
          if (shortcutData.category === this.englishWordsCategory) {
            // For English words, add "- " after the prefix
            // Example: ווואטסאפ -> ו-WhatsApp
            if (prefix === 'ו' && shortcut.startsWith('וו')) {
              // Special case: ווואטסאפ -> ו-WhatsApp
              expansion = prefix + '- ' + expansion;
            } else {
              expansion = prefix + expansion;
            }
          } else if (prefix === 'ה' && expansion.startsWith('ה')) {
            // Keep single ה for Hebrew words starting with ה
            expansion = expansion;
          } else {
            expansion = prefix + expansion;
          }
          
          const startPos = cursorPosition - prefixedShortcut.length;
          const newText = text.substring(0, startPos) + expansion + afterCursor;
          const newCursorPos = startPos + expansion.length;
          
          return {
            text: newText,
            cursorPosition: newCursorPos,
            expanded: true,
            expandedShortcut: prefixedShortcut,
            expandedTo: expansion
          };
        }
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
      // Update existing user shortcut
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