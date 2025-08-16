export interface ShortcutCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
}

export interface SystemShortcut {
  id: string;
  category_id: string;
  shortcut: string;
  expansion: string;
  language: string;
  description?: string;
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserShortcut {
  id: string;
  user_id: string;
  shortcut: string;
  expansion: string;
  language: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserShortcutQuota {
  user_id: string;
  max_shortcuts: number;
  used_shortcuts: number;
  last_reset_at: Date;
  upgraded_at?: Date;
  created_at: Date;
}

export interface ShortcutUsageStats {
  id: string;
  user_id: string;
  shortcut_id?: string;
  shortcut_text: string;
  expansion_text: string;
  source: 'system' | 'user';
  used_at: Date;
}

// Combined shortcut for frontend
export interface CombinedShortcut {
  shortcut: string;
  expansion: string;
  source: 'system' | 'user';
  category?: string;
  description?: string;
  language: string;
}

// API response types
export interface ShortcutsResponse {
  shortcuts: CombinedShortcut[];
  quota: {
    max: number;
    used: number;
    remaining: number;
  };
  categories: string[];
}

export interface AddShortcutRequest {
  shortcut: string;
  expansion: string;
  language?: string;
}

export interface UpdateShortcutRequest {
  expansion?: string;
  is_active?: boolean;
}

export interface ShortcutError {
  code: string;
  message: string;
  details?: any;
}