export interface SpeakerData {
  id: string;
  code: string;
  name: string;
  color: string;
  colorIndex: number;
  blockCount: number;
  timestamp?: number;
}

export class SpeakerManager {
  private speakers: Map<string, SpeakerData> = new Map();
  private hebrewMap: Map<string, string> = new Map(); // code -> id
  private englishMap: Map<string, string> = new Map(); // code -> id
  private nameMap: Map<string, string> = new Map(); // name -> id
  private nextColorIndex = 0;

  // Color palette
  private readonly colorPalette = [
    '#667eea',  // Purple
    '#10b981',  // Green
    '#f59e0b',  // Amber
    '#ef4444',  // Red
    '#3b82f6',  // Blue
    '#ec4899',  // Pink
    '#22c55e',  // Emerald
    '#a855f7',  // Violet
  ];

  // Hebrew codes
  private readonly hebrewCodes = [
    'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
    'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
  ];

  // English codes
  private readonly englishCodes = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z'
  ];

  constructor() {
    // Initialize with default speaker if needed
    if (this.speakers.size === 0) {
      this.addSpeaker('א');
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `speaker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if character is Hebrew
  private isHebrewLetter(char: string): boolean {
    const code = char.charCodeAt(0);
    return (code >= 0x05D0 && code <= 0x05EA) || (code >= 0x05F0 && code <= 0x05F4);
  }

  // Check if character is English
  private isEnglishLetter(char: string): boolean {
    return /^[A-Za-z]$/.test(char);
  }

  // Get next available code
  private getNextAvailableCode(): string {
    // Try Hebrew codes first
    for (const code of this.hebrewCodes) {
      if (!this.hebrewMap.has(code)) {
        return code;
      }
    }
    
    // Then try English codes
    for (const code of this.englishCodes) {
      if (!this.englishMap.has(code)) {
        return code;
      }
    }
    
    // If all codes are taken, return empty
    return '';
  }

  // Generate default name for code
  private generateDefaultName(code: string): string {
    if (this.isHebrewLetter(code)) {
      const index = this.hebrewCodes.indexOf(code) + 1;
      return `דובר ${index}`;
    } else if (this.isEnglishLetter(code)) {
      return `Speaker ${code.toUpperCase()}`;
    }
    return 'דובר חדש';
  }

  // Add new speaker
  addSpeaker(code?: string, name?: string): SpeakerData {
    // Use provided code or get next available
    const speakerCode = code || this.getNextAvailableCode();
    
    // Check if code already exists
    if (speakerCode) {
      if (this.isHebrewLetter(speakerCode) && this.hebrewMap.has(speakerCode)) {
        const existingId = this.hebrewMap.get(speakerCode)!;
        return this.speakers.get(existingId)!;
      }
      if (this.isEnglishLetter(speakerCode) && this.englishMap.has(speakerCode.toUpperCase())) {
        const existingId = this.englishMap.get(speakerCode.toUpperCase())!;
        return this.speakers.get(existingId)!;
      }
    }
    
    // Generate name if not provided
    const speakerName = name || this.generateDefaultName(speakerCode);
    
    // Assign color
    const colorIndex = this.nextColorIndex % this.colorPalette.length;
    const color = this.colorPalette[colorIndex];
    this.nextColorIndex++;
    
    // Create speaker
    const speaker: SpeakerData = {
      id: this.generateId(),
      code: speakerCode,
      name: speakerName,
      color,
      colorIndex,
      blockCount: 0,
      timestamp: Date.now()
    };
    
    // Add to maps
    this.speakers.set(speaker.id, speaker);
    this.nameMap.set(speaker.name, speaker.id);
    
    if (speakerCode) {
      if (this.isHebrewLetter(speakerCode)) {
        this.hebrewMap.set(speakerCode, speaker.id);
      } else if (this.isEnglishLetter(speakerCode)) {
        this.englishMap.set(speakerCode.toUpperCase(), speaker.id);
      }
    }
    
    return speaker;
  }

  // Remove speaker
  removeSpeaker(id: string): boolean {
    const speaker = this.speakers.get(id);
    if (!speaker) return false;
    
    // Remove from all maps
    this.speakers.delete(id);
    this.nameMap.delete(speaker.name);
    
    if (speaker.code) {
      if (this.isHebrewLetter(speaker.code)) {
        this.hebrewMap.delete(speaker.code);
      } else if (this.isEnglishLetter(speaker.code)) {
        this.englishMap.delete(speaker.code.toUpperCase());
      }
    }
    
    return true;
  }

  // Update speaker name
  updateSpeakerName(id: string, newName: string): SpeakerData | null {
    const speaker = this.speakers.get(id);
    if (!speaker) return null;
    
    // Remove old name mapping
    this.nameMap.delete(speaker.name);
    
    // Update speaker
    speaker.name = newName;
    
    // Add new name mapping
    this.nameMap.set(newName, id);
    
    return speaker;
  }

  // Update block count
  updateBlockCount(id: string, count: number): void {
    const speaker = this.speakers.get(id);
    if (speaker) {
      speaker.blockCount = count;
    }
  }

  // Find speaker by code
  findByCode(code: string): SpeakerData | null {
    if (!code) return null;
    
    let speakerId: string | undefined;
    
    if (this.isHebrewLetter(code)) {
      speakerId = this.hebrewMap.get(code);
    } else if (this.isEnglishLetter(code)) {
      speakerId = this.englishMap.get(code.toUpperCase());
    }
    
    return speakerId ? this.speakers.get(speakerId) || null : null;
  }

  // Find speaker by name
  findByName(name: string): SpeakerData | null {
    const speakerId = this.nameMap.get(name);
    return speakerId ? this.speakers.get(speakerId) || null : null;
  }

  // Get all speakers
  getAllSpeakers(): SpeakerData[] {
    return Array.from(this.speakers.values()).sort((a, b) => {
      // Sort by timestamp (creation order)
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
  }

  // Get speaker by ID
  getSpeaker(id: string): SpeakerData | null {
    return this.speakers.get(id) || null;
  }

  // Export to JSON
  exportToJSON(): string {
    const speakers = this.getAllSpeakers().map(s => ({
      code: s.code,
      name: s.name,
      color: s.color,
      blockCount: s.blockCount
    }));
    return JSON.stringify(speakers, null, 2);
  }

  // Import from JSON
  importFromJSON(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (!Array.isArray(imported)) return;
      
      // Clear existing speakers
      this.speakers.clear();
      this.hebrewMap.clear();
      this.englishMap.clear();
      this.nameMap.clear();
      this.nextColorIndex = 0;
      
      // Import each speaker
      imported.forEach((speakerData: any) => {
        this.addSpeaker(speakerData.code, speakerData.name);
      });
    } catch (error) {
      console.error('Failed to import speakers:', error);
    }
  }

  // Get statistics
  getStatistics() {
    const speakers = this.getAllSpeakers();
    return {
      total: speakers.length,
      hebrew: speakers.filter(s => s.code && this.isHebrewLetter(s.code)).length,
      english: speakers.filter(s => s.code && this.isEnglishLetter(s.code)).length,
      totalBlocks: speakers.reduce((sum, s) => sum + s.blockCount, 0)
    };
  }
}

export default SpeakerManager;