import { ShortcutData } from '../types/shortcuts';

/**
 * Import/Export utilities for shortcuts
 */

export interface ExportData {
  shortcuts: Array<{
    shortcut: string;
    expansion: string;
    description?: string;
    category?: string;
  }>;
  metadata: {
    exportDate: string;
    version: string;
    count: number;
  };
}

/**
 * Export shortcuts to CSV format
 */
export function exportToCSV(shortcuts: Map<string, ShortcutData>, onlyPersonal: boolean = false): string {
  const lines: string[] = [];
  
  // Add BOM for Hebrew support in Excel
  const BOM = '\uFEFF';
  
  // Add header
  lines.push('קיצור,טקסט מלא,תיאור,קטגוריה,מקור');
  
  // Add shortcuts
  shortcuts.forEach((data, shortcut) => {
    if (onlyPersonal && data.source !== 'user') return;
    
    const row = [
      escapeCSV(shortcut),
      escapeCSV(data.expansion),
      escapeCSV(data.description || ''),
      escapeCSV(data.category || ''),
      escapeCSV(data.source || 'user')
    ];
    
    lines.push(row.join(','));
  });
  
  return BOM + lines.join('\r\n');
}

/**
 * Export shortcuts to JSON format
 */
export function exportToJSON(shortcuts: Map<string, ShortcutData>, onlyPersonal: boolean = false): string {
  const exportData: ExportData = {
    shortcuts: [],
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0',
      count: 0
    }
  };
  
  shortcuts.forEach((data, shortcut) => {
    if (onlyPersonal && data.source !== 'user') return;
    
    exportData.shortcuts.push({
      shortcut,
      expansion: data.expansion,
      description: data.description,
      category: data.category
    });
  });
  
  exportData.metadata.count = exportData.shortcuts.length;
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Parse CSV file content
 */
export async function parseCSV(content: string): Promise<Array<{
  shortcut: string;
  expansion: string;
  description?: string;
  category?: string;
}>> {
  const lines = content.split(/\r?\n/);
  const shortcuts: Array<{
    shortcut: string;
    expansion: string;
    description?: string;
    category?: string;
  }> = [];
  
  // Skip header if present
  let startIndex = 0;
  if (lines[0] && (
    lines[0].includes('קיצור') || 
    lines[0].toLowerCase().includes('shortcut') ||
    lines[0].includes('Shortcut')
  )) {
    startIndex = 1;
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const fields = parseCSVLine(line);
    if (fields.length >= 2) {
      shortcuts.push({
        shortcut: fields[0],
        expansion: fields[1],
        description: fields[2] || undefined,
        category: fields[3] || undefined
      });
    }
  }
  
  return shortcuts;
}

/**
 * Parse JSON file content
 */
export async function parseJSON(content: string): Promise<Array<{
  shortcut: string;
  expansion: string;
  description?: string;
  category?: string;
}>> {
  try {
    const data = JSON.parse(content);
    
    // Handle different JSON formats
    if (Array.isArray(data)) {
      return data.filter(item => item.shortcut && item.expansion);
    } else if (data.shortcuts && Array.isArray(data.shortcuts)) {
      return data.shortcuts.filter((item: any) => item.shortcut && item.expansion);
    } else if (typeof data === 'object') {
      // Handle object format where keys are shortcuts
      const shortcuts: Array<{
        shortcut: string;
        expansion: string;
        description?: string;
        category?: string;
      }> = [];
      
      Object.entries(data).forEach(([key, value]: [string, any]) => {
        if (typeof value === 'string') {
          shortcuts.push({ shortcut: key, expansion: value });
        } else if (value && typeof value === 'object' && value.expansion) {
          shortcuts.push({
            shortcut: key,
            expansion: value.expansion,
            description: value.description,
            category: value.category
          });
        }
      });
      
      return shortcuts;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    throw new Error('קובץ JSON לא תקין');
  }
}

/**
 * Parse text file content (simple format: shortcut<TAB>expansion)
 */
export async function parseText(content: string): Promise<Array<{
  shortcut: string;
  expansion: string;
  description?: string;
  category?: string;
}>> {
  const lines = content.split(/\r?\n/);
  const shortcuts: Array<{
    shortcut: string;
    expansion: string;
    description?: string;
    category?: string;
  }> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Support different delimiters
    let parts: string[] = [];
    
    if (trimmed.includes('\t')) {
      parts = trimmed.split('\t');
    } else if (trimmed.includes('|')) {
      parts = trimmed.split('|').map(p => p.trim());
    } else if (trimmed.includes('->')) {
      parts = trimmed.split('->').map(p => p.trim());
    } else if (trimmed.includes('=>')) {
      parts = trimmed.split('=>').map(p => p.trim());
    } else if (trimmed.includes('←')) {
      // Handle Hebrew arrow
      parts = [trimmed.split('←')[1]?.trim(), trimmed.split('←')[0]?.trim()].filter(Boolean);
    }
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
      shortcuts.push({
        shortcut: parts[0],
        expansion: parts[1],
        description: parts[2] || undefined
      });
    }
  }
  
  return shortcuts;
}

/**
 * Validate imported shortcuts
 */
export function validateShortcuts(
  shortcuts: Array<{ shortcut: string; expansion: string }>,
  existingShortcuts: Map<string, ShortcutData>
): {
  valid: Array<{ shortcut: string; expansion: string; description?: string; category?: string }>;
  duplicates: Array<{ shortcut: string; expansion: string }>;
  invalid: Array<{ shortcut: string; expansion: string; reason: string }>;
} {
  const valid: Array<{ shortcut: string; expansion: string; description?: string; category?: string }> = [];
  const duplicates: Array<{ shortcut: string; expansion: string }> = [];
  const invalid: Array<{ shortcut: string; expansion: string; reason: string }> = [];
  
  const seenShortcuts = new Set<string>();
  
  for (const item of shortcuts) {
    // Check for empty values
    if (!item.shortcut || !item.expansion) {
      invalid.push({ ...item, reason: 'ערכים ריקים' });
      continue;
    }
    
    // Check length limits
    if (item.shortcut.length > 20) {
      invalid.push({ ...item, reason: 'קיצור ארוך מדי (מקסימום 20 תווים)' });
      continue;
    }
    
    if (item.expansion.length > 500) {
      invalid.push({ ...item, reason: 'טקסט מלא ארוך מדי (מקסימום 500 תווים)' });
      continue;
    }
    
    // Check for invalid characters in shortcut
    if (!/^[א-תa-zA-Z0-9'\"\-\.\/\\s]+$/.test(item.shortcut)) {
      invalid.push({ ...item, reason: 'תווים לא חוקיים בקיצור' });
      continue;
    }
    
    // Check for duplicates in import
    if (seenShortcuts.has(item.shortcut)) {
      duplicates.push(item);
      continue;
    }
    
    // Check for existing shortcuts
    if (existingShortcuts.has(item.shortcut)) {
      duplicates.push(item);
      continue;
    }
    
    seenShortcuts.add(item.shortcut);
    valid.push(item);
  }
  
  return { valid, duplicates, invalid };
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Helper function to parse a CSV line
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(field => field.trim());
}