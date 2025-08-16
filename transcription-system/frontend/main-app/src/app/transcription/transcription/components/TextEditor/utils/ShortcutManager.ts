import {
  ShortcutData,
  UserQuota,
  ProcessTextResult,
  ShortcutAPIResponse,
  AddShortcutRequest,
  ShortcutCategory
} from '../types/shortcuts';

/**
 * ShortcutManager - Manages text shortcuts for the TextEditor
 * Handles both system and user shortcuts with real-time text processing
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
  
  // Hebrew prefixes that can combine with shortcuts
  private readonly hebrewPrefixes = ['ו', 'ה', 'ש', 'וש', 'כש', 'ב', 'ל', 'מ', 'כ', 'מה'];
  
  constructor(apiUrl?: string) {
    if (apiUrl) {
      this.apiUrl = apiUrl;
    }
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
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load shortcuts: ${response.statusText}`);
      }
      
      const data: ShortcutAPIResponse = await response.json();
      
      // Clear and rebuild shortcuts map
      this.shortcuts.clear();
      data.shortcuts.forEach(([shortcut, shortcutData]) => {
        this.shortcuts.set(shortcut, shortcutData);
      });
      
      // Update quota and categories
      this.quota = data.quota;
      this.categories = data.categories || [];
      this.lastFetchTime = now;
      
      console.log(`ShortcutManager: Loaded ${this.shortcuts.size} shortcuts`);
    } catch (error) {
      console.error('ShortcutManager: Error loading shortcuts:', error);
    }
  }
  
  /**
   * Process text for shortcuts at the current cursor position
   */
  processText(text: string, cursorPosition: number): ProcessTextResult {
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Sort shortcuts by length (longest first) for proper matching
    const sortedShortcuts = Array.from(this.shortcuts.keys())
      .sort((a, b) => b.length - a.length);
    
    // Check each shortcut
    for (const shortcut of sortedShortcuts) {
      if (beforeCursor.endsWith(shortcut)) {
        const shortcutData = this.shortcuts.get(shortcut);
        if (!shortcutData) continue;
        
        const expansion = shortcutData.expansion;
        
        // Check if we should expand (usually on space, punctuation, or enter)
        // This check can be customized based on requirements
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
          
          // Special handling for ה prefix with words starting with ה
          if (prefix === 'ה' && expansion.startsWith('ה')) {
            // Keep single ה
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
   * Add a personal shortcut for the user
   */
  async addPersonalShortcut(shortcut: string, expansion: string, description?: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    
    if (this.quota.used >= this.quota.max) {
      throw new Error(`You've reached your limit of ${this.quota.max} personal shortcuts`);
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
        'Authorization': `Bearer ${this.token}`,
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
    
    const response = await fetch(`${this.apiUrl}/${encodeURIComponent(shortcut)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
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
    await this.loadShortcuts(true);
  }
}