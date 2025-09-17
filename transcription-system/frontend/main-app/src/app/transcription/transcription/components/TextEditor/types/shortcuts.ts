// Shortcut types for the TextEditor

export interface ShortcutData {
  expansion: string;
  source: 'system' | 'user';
  category?: string;
  description?: string;
}

export interface UserQuota {
  max: number;
  used: number;
}

export interface ShortcutCategory {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
}

export interface SystemShortcut {
  id: string;
  categoryId: string;
  shortcut: string;
  expansion: string;
  language: string;
  description?: string;
  priority: number;
  isActive: boolean;
}

export interface UserShortcut {
  id: string;
  userId: string;
  shortcut: string;
  expansion: string;
  language: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessTextResult {
  text: string;
  cursorPosition: number;
  expanded: boolean;
  expandedShortcut?: string;
  expandedTo?: string;
  // For undo functionality
  processed?: boolean;
  originalText?: string;
  expansionStart?: number;
  expansionEnd?: number;
}

export interface ShortcutAPIResponse {
  shortcuts: Array<[string, ShortcutData]>;
  quota: UserQuota;
  categories: ShortcutCategory[];
}

export interface AddShortcutRequest {
  shortcut: string;
  expansion: string;
  description?: string;
  // allowOverride?: boolean; // TODO: Implement when backend supports it
}

export interface ShortcutUsageStats {
  shortcut: string;
  expansion: string;
  source: 'system' | 'user';
  usedAt: Date;
}