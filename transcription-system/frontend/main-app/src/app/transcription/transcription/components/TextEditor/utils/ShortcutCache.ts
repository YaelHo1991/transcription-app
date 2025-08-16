/**
 * ShortcutCache - High-performance caching layer for shortcuts
 * Implements LRU cache with prefix tree for fast lookups
 */

interface CacheEntry {
  shortcut: string;
  expansion: string;
  category?: string;
  description?: string;
  source: 'system' | 'user';
  lastUsed: number;
}

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  value?: CacheEntry;
  isEnd: boolean = false;
}

export class ShortcutCache {
  private trie: TrieNode = new TrieNode();
  private lruCache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 1000;
  private hitCount: number = 0;
  private missCount: number = 0;
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }
  
  /**
   * Add a shortcut to the cache
   */
  set(shortcut: string, entry: Omit<CacheEntry, 'lastUsed'>): void {
    const fullEntry: CacheEntry = {
      ...entry,
      shortcut,
      lastUsed: Date.now()
    };
    
    // Add to trie for prefix matching
    this.addToTrie(shortcut, fullEntry);
    
    // Add to LRU cache
    if (this.lruCache.size >= this.maxSize) {
      // Remove least recently used
      const lru = this.findLRU();
      if (lru) {
        this.lruCache.delete(lru);
        this.removeFromTrie(lru);
      }
    }
    
    this.lruCache.set(shortcut, fullEntry);
  }
  
  /**
   * Get a shortcut from the cache
   */
  get(shortcut: string): CacheEntry | undefined {
    const entry = this.lruCache.get(shortcut);
    
    if (entry) {
      this.hitCount++;
      // Update last used time
      entry.lastUsed = Date.now();
      // Move to front in LRU
      this.lruCache.delete(shortcut);
      this.lruCache.set(shortcut, entry);
      return entry;
    }
    
    this.missCount++;
    return undefined;
  }
  
  /**
   * Find shortcuts by prefix (for autocomplete)
   */
  findByPrefix(prefix: string, limit: number = 10): CacheEntry[] {
    const results: CacheEntry[] = [];
    const node = this.findTrieNode(prefix);
    
    if (node) {
      this.collectAll(node, results, limit);
    }
    
    return results;
  }
  
  /**
   * Check if text ends with any shortcut
   */
  findMatch(text: string): CacheEntry | undefined {
    // Check from longest to shortest possible match
    for (let i = Math.max(0, text.length - 20); i < text.length; i++) {
      const substring = text.slice(i);
      const entry = this.get(substring);
      if (entry) {
        return entry;
      }
    }
    return undefined;
  }
  
  /**
   * Bulk load shortcuts
   */
  bulkLoad(shortcuts: Array<[string, Omit<CacheEntry, 'shortcut' | 'lastUsed'>]>): void {
    // Clear existing cache
    this.clear();
    
    // Sort by length (longer shortcuts first) for better matching
    shortcuts.sort((a, b) => b[0].length - a[0].length);
    
    // Add all shortcuts
    for (const [shortcut, data] of shortcuts) {
      this.set(shortcut, data);
    }
  }
  
  /**
   * Clear the cache
   */
  clear(): void {
    this.trie = new TrieNode();
    this.lruCache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.lruCache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hitCount / total : 0,
      hits: this.hitCount,
      misses: this.missCount
    };
  }
  
  /**
   * Pre-warm cache with most used shortcuts
   */
  warmUp(shortcuts: string[]): void {
    for (const shortcut of shortcuts) {
      // Trigger a get to warm up the cache
      this.get(shortcut);
    }
  }
  
  // Private helper methods
  
  private addToTrie(key: string, value: CacheEntry): void {
    let node = this.trie;
    
    for (const char of key) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    
    node.isEnd = true;
    node.value = value;
  }
  
  private removeFromTrie(key: string): void {
    const removeHelper = (node: TrieNode, index: number): boolean => {
      if (index === key.length) {
        node.isEnd = false;
        node.value = undefined;
        return node.children.size === 0;
      }
      
      const char = key[index];
      const childNode = node.children.get(char);
      
      if (!childNode) {
        return false;
      }
      
      const shouldDelete = removeHelper(childNode, index + 1);
      
      if (shouldDelete) {
        node.children.delete(char);
        return !node.isEnd && node.children.size === 0;
      }
      
      return false;
    };
    
    removeHelper(this.trie, 0);
  }
  
  private findTrieNode(prefix: string): TrieNode | undefined {
    let node = this.trie;
    
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return undefined;
      }
      node = node.children.get(char)!;
    }
    
    return node;
  }
  
  private collectAll(node: TrieNode, results: CacheEntry[], limit: number): void {
    if (results.length >= limit) {
      return;
    }
    
    if (node.isEnd && node.value) {
      results.push(node.value);
    }
    
    for (const child of node.children.values()) {
      this.collectAll(child, results, limit);
    }
  }
  
  private findLRU(): string | undefined {
    let lru: string | undefined;
    let minTime = Infinity;
    
    for (const [key, entry] of this.lruCache) {
      if (entry.lastUsed < minTime) {
        minTime = entry.lastUsed;
        lru = key;
      }
    }
    
    return lru;
  }
}

// Singleton instance
let cacheInstance: ShortcutCache | null = null;

export function getShortcutCache(maxSize?: number): ShortcutCache {
  if (!cacheInstance) {
    cacheInstance = new ShortcutCache(maxSize);
  }
  return cacheInstance;
}

export function resetShortcutCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
  }
  cacheInstance = null;
}