import { TextBlockData } from './TextBlock';

export class BlockManager {
  private blocks: TextBlockData[] = [];
  private activeBlockId: string | null = null;
  private activeArea: 'speaker' | 'text' = 'speaker';

  constructor(initialText?: string, initialTime?: number) {
    // Initialize with at least one block
    this.blocks = [];
    this.activeBlockId = null;
    this.activeArea = 'speaker';
    
    if (initialText) {
      this.parseText(initialText);
    } else {
      // Add first block with initial timestamp
      this.addBlock(undefined, initialTime || 0);
    }
  }
  
  // Update the first block's timestamp if it doesn't have one
  setFirstBlockTimestamp(time: number): void {
    if (this.blocks.length > 0 && this.blocks[0].speakerTime === undefined) {
      this.blocks[0].speakerTime = time;
    }
  }

  // Parse text into blocks
  private parseText(text: string): void {
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      this.addBlock();
      return;
    }

    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      let speaker = '';
      let content = line;
      
      if (colonIndex > 0 && colonIndex < 30) {
        speaker = line.substring(0, colonIndex).trim();
        content = line.substring(colonIndex + 1).trim();
      }
      
      this.blocks.push({
        id: this.generateId(),
        speaker,
        text: content
      });
    });

    if (this.blocks.length > 0) {
      this.activeBlockId = this.blocks[0].id;
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add new block
  addBlock(afterId?: string, speakerTime?: number): TextBlockData {
    const newBlock: TextBlockData = {
      id: this.generateId(),
      speaker: '',
      text: '',
      speakerTime
    };

    if (afterId) {
      const index = this.blocks.findIndex(b => b.id === afterId);
      if (index !== -1) {
        this.blocks.splice(index + 1, 0, newBlock);
      } else {
        this.blocks.push(newBlock);
      }
    } else {
      this.blocks.push(newBlock);
    }

    this.activeBlockId = newBlock.id;
    this.activeArea = 'speaker';
    
    return newBlock;
  }

  // Remove block
  removeBlock(id: string): boolean {
    const index = this.blocks.findIndex(b => b.id === id);
    if (index === -1) return false;

    // Don't remove the last block
    if (this.blocks.length === 1) {
      // Clear the last block instead
      this.blocks[0].speaker = '';
      this.blocks[0].text = '';
      return false;
    }

    this.blocks.splice(index, 1);

    // Update active block
    if (this.activeBlockId === id) {
      if (index > 0) {
        this.activeBlockId = this.blocks[index - 1].id;
        this.activeArea = 'text';  // Focus on text field of previous block
      } else if (this.blocks.length > 0) {
        this.activeBlockId = this.blocks[0].id;
        this.activeArea = 'speaker';
      }
    }

    return true;
  }

  // Update block content
  updateBlock(id: string, field: 'speaker' | 'text', value: string): void {
    const block = this.blocks.find(b => b.id === id);
    if (block) {
      block[field] = value;
    }
  }

  // Navigate between blocks - RTL aware
  navigate(direction: 'prev' | 'next' | 'up' | 'down' | 'speaker' | 'text'): void {
    if (!this.activeBlockId) return;

    const currentIndex = this.blocks.findIndex(b => b.id === this.activeBlockId);
    if (currentIndex === -1) return;

    switch (direction) {
      case 'prev':
        // In RTL, 'prev' means going backwards (to the right)
        if (this.activeArea === 'text') {
          // From text, go back to speaker in same block
          this.activeArea = 'speaker';
        } else if (currentIndex > 0) {
          // From speaker, go to previous block's text
          this.activeBlockId = this.blocks[currentIndex - 1].id;
          this.activeArea = 'text';
        }
        break;

      case 'next':
        // In RTL, 'next' means going forward (to the left)
        if (this.activeArea === 'speaker') {
          // From speaker, go to text in same block
          this.activeArea = 'text';
        } else if (currentIndex < this.blocks.length - 1) {
          // From text, go to next block's speaker
          this.activeBlockId = this.blocks[currentIndex + 1].id;
          this.activeArea = 'speaker';
        } else {
          // At the last block's text - optionally add new block
          // For now, just stay where we are
          // Could uncomment below to auto-add new block:
          // const newBlock = this.addBlock(this.activeBlockId);
          // this.activeBlockId = newBlock.id;
          // this.activeArea = 'speaker';
        }
        break;

      case 'up':
        // Go to previous block, keeping the same field (speaker or text)
        if (currentIndex > 0) {
          this.activeBlockId = this.blocks[currentIndex - 1].id;
          // Keep the same activeArea (speaker or text)
        }
        break;

      case 'down':
        // Go to next block, keeping the same field (speaker or text)
        if (currentIndex < this.blocks.length - 1) {
          this.activeBlockId = this.blocks[currentIndex + 1].id;
          // Keep the same activeArea (speaker or text)
        }
        break;

      case 'speaker':
        this.activeArea = 'speaker';
        break;

      case 'text':
        this.activeArea = 'text';
        break;
    }
  }

  // Get all blocks
  getBlocks(): TextBlockData[] {
    return this.blocks;
  }

  // Get active block
  getActiveBlock(): TextBlockData | null {
    return this.blocks.find(b => b.id === this.activeBlockId) || null;
  }

  // Get active area
  getActiveArea(): 'speaker' | 'text' {
    return this.activeArea;
  }

  // Get active block ID
  getActiveBlockId(): string | null {
    return this.activeBlockId;
  }

  // Set active block
  setActiveBlock(id: string, area: 'speaker' | 'text' = 'speaker'): void {
    if (this.blocks.find(b => b.id === id)) {
      this.activeBlockId = id;
      this.activeArea = area;
    }
  }

  // Get text content
  getText(): string {
    return this.blocks.map(block => {
      const speaker = block.speaker ? `${block.speaker}: ` : '';
      return speaker + block.text;
    }).join('\n');
  }

  // Get block statistics
  getStatistics() {
    const stats = {
      totalBlocks: this.blocks.length,
      blocksWithSpeaker: this.blocks.filter(b => b.speaker).length,
      totalWords: 0,
      totalCharacters: 0,
      speakers: new Map<string, number>()
    };

    this.blocks.forEach(block => {
      // Count words and characters
      const text = block.text || '';
      stats.totalWords += text.split(/\s+/).filter(w => w).length;
      stats.totalCharacters += text.length;

      // Count speakers
      if (block.speaker) {
        const count = stats.speakers.get(block.speaker) || 0;
        stats.speakers.set(block.speaker, count + 1);
      }
    });

    return stats;
  }

  // Find blocks by speaker
  findBlocksBySpeaker(speaker: string): TextBlockData[] {
    return this.blocks.filter(b => b.speaker === speaker);
  }

  // Update all blocks with a specific speaker
  updateSpeakerName(oldName: string, newName: string): void {
    this.blocks.forEach(block => {
      if (block.speaker === oldName) {
        block.speaker = newName;
      }
    });
  }

  // Clear all blocks
  clear(): void {
    this.blocks = [];
    this.addBlock();
  }

  // Export blocks to JSON
  exportToJSON(): string {
    return JSON.stringify(this.blocks, null, 2);
  }

  // Import blocks from JSON
  importFromJSON(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.blocks = imported.map(block => ({
          id: this.generateId(),
          speaker: block.speaker || '',
          text: block.text || '',
          speakerTime: block.speakerTime
        }));
        
        if (this.blocks.length > 0) {
          this.activeBlockId = this.blocks[0].id;
          this.activeArea = 'speaker';
        }
      }
    } catch (error) {
      console.error('Failed to import blocks:', error);
    }
  }
}

export default BlockManager;