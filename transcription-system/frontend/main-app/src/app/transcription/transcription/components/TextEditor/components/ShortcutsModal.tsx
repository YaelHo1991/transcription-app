'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShortcutData } from '../types/shortcuts';
import AddShortcutForm from './AddShortcutForm';
import ImportExportModal from './ImportExportModal';
import { EditorPreferencesService } from '../utils/editorPreferencesService';
import './ShortcutsModal.css';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Map<string, ShortcutData>;
  onToggleShortcuts: () => void;
  shortcutsEnabled: boolean;
  onAddShortcut?: (shortcut: string, expansion: string, description?: string) => Promise<void>;
  onEditShortcut?: (oldShortcut: string, newShortcut: string, expansion: string, description?: string) => Promise<void>;
  onDeleteShortcut?: (shortcut: string) => Promise<void>;
  userQuota?: { used: number; max: number };
  transcriptionId?: string;
}

export default function ShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
  onToggleShortcuts,
  shortcutsEnabled,
  onAddShortcut,
  onEditShortcut,
  onDeleteShortcut,
  userQuota,
  transcriptionId
}: ShortcutsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'system' | 'personal'>('system');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<{ shortcut: string; expansion: string; description?: string } | undefined>();
  const [deletingShortcut, setDeletingShortcut] = useState<string | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);

  // Tab configuration state
  const [tabConfigs, setTabConfigs] = useState<{
    system: { modeEnabled: boolean; pauseOnTabSwitch: boolean };
    personal: { modeEnabled: boolean; pauseOnTabSwitch: boolean };
  }>({
    system: { modeEnabled: true, pauseOnTabSwitch: false },
    personal: { modeEnabled: true, pauseOnTabSwitch: false }
  });

  // Load tab configurations on component mount
  useEffect(() => {
    if (transcriptionId) {
      const systemConfig = EditorPreferencesService.getTabConfig(transcriptionId, 'system');
      const personalConfig = EditorPreferencesService.getTabConfig(transcriptionId, 'personal');
      
      setTabConfigs({
        system: {
          modeEnabled: systemConfig.modeEnabled ?? true,
          pauseOnTabSwitch: systemConfig.pauseOnTabSwitch ?? false
        },
        personal: {
          modeEnabled: personalConfig.modeEnabled ?? true,
          pauseOnTabSwitch: personalConfig.pauseOnTabSwitch ?? false
        }
      });
    }
  }, [transcriptionId]);

  // Save tab configurations when they change
  useEffect(() => {
    if (transcriptionId) {
      EditorPreferencesService.saveTabConfig(transcriptionId, 'system', tabConfigs.system);
      EditorPreferencesService.saveTabConfig(transcriptionId, 'personal', tabConfigs.personal);
    }
  }, [transcriptionId, tabConfigs]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    shortcuts.forEach(data => {
      if (data.category) cats.add(data.category);
    });
    return Array.from(cats).sort();
  }, [shortcuts]);

  // Filter shortcuts based on search and category
  const filteredShortcuts = useMemo(() => {
    const filtered = new Map<string, ShortcutData>();
    
    shortcuts.forEach((data, shortcut) => {
      // Filter by tab (system vs personal)
      if (activeTab === 'system' && data.source !== 'system') return;
      if (activeTab === 'personal' && data.source !== 'user') return;
      
      // Filter by category
      if (selectedCategory !== 'all' && data.category !== selectedCategory) return;
      
      // Filter by search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!shortcut.toLowerCase().includes(search) &&
            !data.expansion.toLowerCase().includes(search) &&
            !(data.description?.toLowerCase().includes(search))) {
          return;
        }
      }
      
      filtered.set(shortcut, data);
    });
    
    return filtered;
  }, [shortcuts, searchTerm, selectedCategory, activeTab]);

  // Group shortcuts by category for display
  const groupedShortcuts = useMemo(() => {
    const groups = new Map<string, Map<string, ShortcutData>>();
    
    filteredShortcuts.forEach((data, shortcut) => {
      const category = data.category || 'uncategorized';
      if (!groups.has(category)) {
        groups.set(category, new Map());
      }
      groups.get(category)!.set(shortcut, data);
    });
    
    return groups;
  }, [filteredShortcuts]);

  // Count shortcuts by type
  const systemCount = Array.from(shortcuts.values()).filter(s => s.source === 'system').length;
  const personalCount = Array.from(shortcuts.values()).filter(s => s.source === 'user').length;

  // Handle shortcut actions
  const handleEdit = (shortcut: string, data: ShortcutData) => {
    setEditingShortcut({
      shortcut,
      expansion: data.expansion,
      description: data.description
    });
    setShowAddForm(true);
  };

  const handleDelete = async (shortcut: string) => {
    if (!onDeleteShortcut) return;
    
    if (deletingShortcut === shortcut) {
      // Confirm deletion
      try {
        await onDeleteShortcut(shortcut);
        setDeletingShortcut(null);
      } catch (error) {
        console.error('Failed to delete shortcut:', error);
        setDeletingShortcut(null);
      }
    } else {
      // First click - request confirmation
      setDeletingShortcut(shortcut);
      // Reset after 3 seconds
      setTimeout(() => setDeletingShortcut(null), 3000);
    }
  };

  const handleAddShortcut = async (shortcut: string, expansion: string, description?: string) => {
    if (!onAddShortcut) throw new Error('Add shortcut handler not provided');
    await onAddShortcut(shortcut, expansion, description);
    setShowAddForm(false);
  };

  const handleEditShortcut = async (oldShortcut: string, newShortcut: string, expansion: string, description?: string) => {
    if (!onEditShortcut) throw new Error('Edit shortcut handler not provided');
    await onEditShortcut(oldShortcut, newShortcut, expansion, description);
    setShowAddForm(false);
    setEditingShortcut(undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h2>קיצורי מקלדת</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="shortcuts-modal-controls">
          <div className="shortcuts-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={shortcutsEnabled}
                onChange={onToggleShortcuts}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {shortcutsEnabled ? 'קיצורים פעילים' : 'קיצורים כבויים'}
            </span>
          </div>

          <div className="shortcuts-actions">
            <button 
              className="import-export-btn"
              onClick={() => setShowImportExport(true)}
              title="ייבוא/ייצוא קיצורים"
            >
              📥📤
            </button>
            
            <div className="shortcuts-search">
              <input
                type="text"
                placeholder="חיפוש קיצורים..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
        </div>

        <div className="shortcuts-tabs">
          <button
            className={'tab-btn ' + (activeTab === 'system' ? 'active' : '')}
            onClick={() => setActiveTab('system')}
          >
            קיצורי מערכת ({systemCount})
          </button>
          <button
            className={'tab-btn ' + (activeTab === 'personal' ? 'active' : '')}
            onClick={() => setActiveTab('personal')}
          >
            קיצורים אישיים ({personalCount})
          </button>
        </div>

        {/* Tab Configuration Toggles */}
        <div className="tab-configuration">
          <div className="tab-config-item">
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={tabConfigs[activeTab].modeEnabled}
                onChange={(e) => {
                  setTabConfigs(prev => ({
                    ...prev,
                    [activeTab]: {
                      ...prev[activeTab],
                      modeEnabled: e.target.checked
                    }
                  }));
                }}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="config-label">
              {activeTab === 'system' ? 'מצב מערכת פעיל' : 'מצב אישי פעיל'}
            </span>
          </div>
          
          <div className="tab-config-item">
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={tabConfigs[activeTab].pauseOnTabSwitch}
                onChange={(e) => {
                  setTabConfigs(prev => ({
                    ...prev,
                    [activeTab]: {
                      ...prev[activeTab],
                      pauseOnTabSwitch: e.target.checked
                    }
                  }));
                }}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="config-label">השהייה בעת החלפת טאב</span>
          </div>
        </div>

        <div className="shortcuts-filters">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">כל הקטגוריות</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>
          <span className="filter-results">
            {filteredShortcuts.size} קיצורים
          </span>
        </div>

        <div className="shortcuts-list">
          {groupedShortcuts.size === 0 ? (
            <div className="no-shortcuts">
              {searchTerm ? 'לא נמצאו קיצורים התואמים לחיפוש' : 'אין קיצורים להצגה'}
            </div>
          ) : (
            Array.from(groupedShortcuts.entries()).map(([category, categoryShortcuts]) => (
              <div key={category} className="shortcuts-category">
                <h3 className="category-title">{getCategoryLabel(category)}</h3>
                <div className="shortcuts-grid">
                  {Array.from(categoryShortcuts.entries()).map(([shortcut, data]) => (
                    <div key={shortcut} className={'shortcut-item ' + (data.source === 'user' ? 'user-shortcut' : '')}>
                      <span className="shortcut-key">{shortcut}</span>
                      <span className="shortcut-arrow">←</span>
                      <span className="shortcut-expansion">{data.expansion}</span>
                      {data.description && (
                        <span className="shortcut-description">{data.description}</span>
                      )}
                      {data.source === 'user' && activeTab === 'personal' && (
                        <div className="shortcut-actions">
                          <button 
                            className="action-btn edit-btn" 
                            onClick={() => handleEdit(shortcut, data)}
                            title="ערוך"
                          >
                            ✏️
                          </button>
                          <button 
                            className={'action-btn delete-btn ' + (deletingShortcut === shortcut ? 'confirming' : '')}
                            onClick={() => handleDelete(shortcut)}
                            title={deletingShortcut === shortcut ? 'לחץ שוב למחיקה' : 'מחק'}
                          >
                            {deletingShortcut === shortcut ? '⚠️' : '🗑️'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {activeTab === 'personal' && (
          <div className="text-editor-shortcuts-footer">
            <button 
              className="add-shortcut-btn"
              onClick={() => {
                setEditingShortcut(undefined);
                setShowAddForm(true);
              }}
              disabled={personalCount >= (userQuota?.max || 100)}
            >
              + הוסף קיצור אישי
            </button>
            <div className="quota-container">
              <span className="quota-info">
                {personalCount} / {userQuota?.max || 100} קיצורים בשימוש
              </span>
              <div className="quota-bar">
                <div 
                  className="quota-fill" 
                  style={{ width: ((personalCount / (userQuota?.max || 100)) * 100) + '%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add/Edit Shortcut Form */}
      <AddShortcutForm
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setEditingShortcut(undefined);
        }}
        onAdd={handleAddShortcut}
        onEdit={editingShortcut ? handleEditShortcut : undefined}
        editingShortcut={editingShortcut}
        existingShortcuts={new Set(Array.from(shortcuts.keys()))}
      />
      
      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        shortcuts={shortcuts}
        onImport={async (importedShortcuts) => {
          // Handle bulk import
          for (const item of importedShortcuts) {
            await onAddShortcut?.(item.shortcut, item.expansion, item.description);
          }
          setShowImportExport(false);
        }}
        userQuota={userQuota}
      />
    </div>
  );
}

// Helper function to get Hebrew category labels
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    punctuation: 'סימני פיסוק',
    legal: 'מונחים משפטיים',
    medical: 'מונחים רפואיים',
    common: 'ביטויים נפוצים',
    business: 'מונחים עסקיים',
    academic: 'מונחים אקדמיים',
    technical: 'מונחים טכניים',
    custom: 'קיצורים אישיים',
    uncategorized: 'ללא קטגוריה'
  };
  return labels[category] || category;
}