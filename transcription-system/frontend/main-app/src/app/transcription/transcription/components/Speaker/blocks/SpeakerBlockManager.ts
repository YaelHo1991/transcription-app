import { SpeakerBlockData } from './SpeakerBlock';

export default class SpeakerBlockManager {
  private blocks: SpeakerBlockData[] = [];
  private activeBlockId: string | null = null;
  private activeField: 'code' | 'name' | 'description' = 'code';
  private nextId = 1;
  
  private colors = [
    '#667eea', '#f59e0b', '#10b981', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#a855f7', '#3b82f6', '#14b8a6'
  ];
  private colorIndex = 0;

  constructor() {
    // Initialize with one empty block
    this.addBlock('', '', '');
  }

  getBlocks(): SpeakerBlockData[] {
    return this.blocks;
  }

  getActiveBlockId(): string | null {
    return this.activeBlockId;
  }

  getActiveField(): 'code' | 'name' | 'description' {
    return this.activeField;
  }

  getActiveBlock(): SpeakerBlockData | null {
    if (!this.activeBlockId) return null;
    return this.blocks.find(b => b.id === this.activeBlockId) || null;
  }

  setActiveBlock(blockId: string, field: 'code' | 'name' | 'description') {
    this.activeBlockId = blockId;
    this.activeField = field;
  }

  addBlock(code = '', name = '', description = '', afterId?: string): SpeakerBlockData {
    const newBlock: SpeakerBlockData = {
      id: `speaker-${this.nextId++}`,
      code,
      name,
      description,
      color: this.colors[this.colorIndex % this.colors.length],
      count: 0
    };
    
    this.colorIndex++;

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
    this.activeField = 'code';
    return newBlock;
  }

  removeBlock(id: string, direction: 'current' | 'next' = 'current'): boolean {
    const index = this.blocks.findIndex(b => b.id === id);
    if (index === -1) return false;
    
    if (direction === 'next') {
      // Delete next block
      if (index === this.blocks.length - 1) return false; // No next block to delete
      
      const nextIndex = index + 1;
      const nextBlockId = this.blocks[nextIndex].id;
      
      this.blocks.splice(nextIndex, 1);
      
      // If we deleted the active block, adjust
      if (this.activeBlockId === nextBlockId) {
        this.activeBlockId = id; // Stay on current block
      }
    } else {
      // Delete current block
      if (this.blocks.length <= 1) return false;
      
      this.blocks.splice(index, 1);

      // Set new active block
      if (this.activeBlockId === id) {
        if (index > 0) {
          this.activeBlockId = this.blocks[index - 1].id;
          this.activeField = 'description'; // Focus on description field of previous block
        } else if (this.blocks.length > 0) {
          this.activeBlockId = this.blocks[0].id;
          this.activeField = 'code';
        } else {
          this.activeBlockId = null;
        }
      }
    }

    return true;
  }

  updateBlock(id: string, field: 'code' | 'name' | 'description', value: string) {
    const block = this.blocks.find(b => b.id === id);
    if (block) {
      block[field] = value;
      
      // Update count based on usage (will be implemented with TextEditor integration)
      return true;
    }
    return false;
  }

  navigate(direction: 'prev' | 'next' | 'up' | 'down' | 'code' | 'name' | 'description'): string | undefined {
    if (!this.activeBlockId) return;
    
    const currentIndex = this.blocks.findIndex(b => b.id === this.activeBlockId);
    if (currentIndex === -1) return;

    switch (direction) {
      case 'prev':
        if (this.activeField === 'code' && currentIndex > 0) {
          this.activeBlockId = this.blocks[currentIndex - 1].id;
          this.activeField = 'description';
        } else if (this.activeField === 'name') {
          this.activeField = 'code';
        } else if (this.activeField === 'description') {
          this.activeField = 'name';
        }
        break;
        
      case 'next':
        if (this.activeField === 'description' && currentIndex < this.blocks.length - 1) {
          this.activeBlockId = this.blocks[currentIndex + 1].id;
          this.activeField = 'code';
        } else if (this.activeField === 'description' && currentIndex === this.blocks.length - 1) {
          // If in description field of last block, exit editing
          this.activeBlockId = null;
          this.activeField = 'code';
          // Return special flag to indicate we should focus remarks
          return 'exit-to-remarks';
        } else if (this.activeField === 'code') {
          this.activeField = 'name';
        } else if (this.activeField === 'name') {
          this.activeField = 'description';
        }
        break;
        
      case 'up':
        if (currentIndex > 0) {
          this.activeBlockId = this.blocks[currentIndex - 1].id;
          // Keep the same field - no change to activeField
        }
        break;
        
      case 'down':
        if (currentIndex < this.blocks.length - 1) {
          this.activeBlockId = this.blocks[currentIndex + 1].id;
          // Keep the same field - no change to activeField
        } else {
          // If at last block, exit editing
          this.activeBlockId = null;
          this.activeField = 'code';
        }
        break;
        
      case 'code':
        this.activeField = 'code';
        break;
        
      case 'name':
        this.activeField = 'name';
        break;
        
      case 'description':
        this.activeField = 'description';
        break;
    }
  }

  findByCode(code: string): SpeakerBlockData | null {
    return this.blocks.find(b => b.code === code) || null;
  }

  findByName(name: string): SpeakerBlockData | null {
    return this.blocks.find(b => b.name === name) || null;
  }

  // Validate that a code is unique
  validateUniqueCode(code: string, excludeId?: string): boolean {
    if (!code) return true; // Empty is valid
    return !this.blocks.some(b => b.code === code && b.id !== excludeId);
  }

  incrementCount(speakerIdentifier: string) {
    const block = this.blocks.find(b => 
      b.code === speakerIdentifier || b.name === speakerIdentifier
    );
    if (block) {
      block.count++;
    }
  }

  getStatistics() {
    // Only count speakers that have both code and name filled
    const filledSpeakers = this.blocks.filter(b => b.code.trim() && b.name.trim());
    
    console.log('All blocks:', this.blocks);
    console.log('Filled speakers:', filledSpeakers);
    
    return {
      totalSpeakers: filledSpeakers.length,
      hebrewSpeakers: filledSpeakers.filter(b => /[\u0590-\u05FF]/.test(b.code)).length,
      englishSpeakers: filledSpeakers.filter(b => /[A-Za-z]/.test(b.code)).length,
      totalBlocks: this.blocks.reduce((sum, b) => sum + b.count, 0)
    };
  }
}