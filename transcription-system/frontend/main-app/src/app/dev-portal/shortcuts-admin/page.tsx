'use client';

import React, { useState, useEffect } from 'react';
import './shortcuts-admin.css';

interface SystemShortcut {
  id: string;
  shortcut: string;
  expansion: string;
  category: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  label: string;
  shortcut_count: number;
  is_active: boolean;
}

interface UserConflict {
  userId: string;
  userName: string;
  conflictingShortcut: string;
  userExpansion: string;
  systemExpansion: string;
  suggestedShortcut: string;
}

type TabType = 'shortcuts' | 'categories' | 'conflicts';

export default function ShortcutsAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('shortcuts');
  const [shortcuts, setShortcuts] = useState<SystemShortcut[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [conflicts, setConflicts] = useState<UserConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingShortcut, setEditingShortcut] = useState<SystemShortcut | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [formData, setFormData] = useState({
    shortcut: '',
    expansion: '',
    category: '',
    description: '',
    is_active: true
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    label: '',
    is_active: true
  });
  const [selectedShortcuts, setSelectedShortcuts] = useState<Set<string>>(new Set());

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load from public API
      const response = await fetch('http://localhost:5000/api/transcription/shortcuts/public');
      if (response.ok) {
        const data = await response.json();
        
        // Define default categories
        const defaultCategories: Category[] = [
          { id: '1', name: 'legal', label: 'משפטי', shortcut_count: 0, is_active: true },
          { id: '2', name: 'medical', label: 'רפואי', shortcut_count: 0, is_active: true },
          { id: '3', name: 'punctuation', label: 'סימני פיסוק', shortcut_count: 0, is_active: true },
          { id: '4', name: 'common', label: 'ביטויים נפוצים', shortcut_count: 0, is_active: true },
          { id: '5', name: 'business', label: 'עסקי', shortcut_count: 0, is_active: true },
          { id: '6', name: 'academic', label: 'אקדמי', shortcut_count: 0, is_active: true },
          { id: '7', name: 'technical', label: 'טכני', shortcut_count: 0, is_active: true }
        ];
        
        const categoryMap = new Map<string, Category>();
        defaultCategories.forEach(cat => categoryMap.set(cat.name, cat));
        
        // Process shortcuts from API
        const systemShortcuts: SystemShortcut[] = [];
        data.shortcuts.forEach(([shortcut, shortcutData]: [string, any], index: number) => {
          if (shortcutData.source === 'system') {
            const category = shortcutData.category || 'common';
            systemShortcuts.push({
              id: String(index + 1),
              shortcut,
              expansion: shortcutData.expansion,
              category,
              description: shortcutData.description,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
            if (categoryMap.has(category)) {
              categoryMap.get(category)!.shortcut_count++;
            }
          }
        });
        
        setCategories(Array.from(categoryMap.values()));
        setShortcuts(systemShortcuts);
      } else {
        // Use default empty data
        setCategories([
          { id: '1', name: 'legal', label: 'משפטי', shortcut_count: 0, is_active: true },
          { id: '2', name: 'medical', label: 'רפואי', shortcut_count: 0, is_active: true },
          { id: '3', name: 'punctuation', label: 'סימני פיסוק', shortcut_count: 0, is_active: true },
          { id: '4', name: 'common', label: 'ביטויים נפוצים', shortcut_count: 0, is_active: true },
          { id: '5', name: 'business', label: 'עסקי', shortcut_count: 0, is_active: true },
          { id: '6', name: 'academic', label: 'אקדמי', shortcut_count: 0, is_active: true },
          { id: '7', name: 'technical', label: 'טכני', shortcut_count: 0, is_active: true }
        ]);
        setShortcuts([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate suggestion for duplicate shortcuts
  const generateSuggestion = (original: string): string => {
    let suggestion = original;
    let counter = 2;
    while (shortcuts.some(s => s.shortcut === suggestion)) {
      suggestion = original + counter;
      counter++;
    }
    return suggestion;
  };

  // Handle shortcut form submission
  const handleShortcutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicates
    const isDuplicate = shortcuts.some(s => 
      s.shortcut === formData.shortcut && s.id !== editingShortcut?.id
    );
    
    if (isDuplicate) {
      const suggestion = generateSuggestion(formData.shortcut);
      if (!confirm(`הקיצור "${formData.shortcut}" כבר קיים!\n\nהצעה חלופית: "${suggestion}"\n\nהאם להשתמש בהצעה?`)) {
        return;
      }
      formData.shortcut = suggestion;
    }
    
    if (editingShortcut) {
      setShortcuts(prev => prev.map(s => 
        s.id === editingShortcut.id 
          ? { ...s, ...formData, updated_at: new Date().toISOString() }
          : s
      ));
    } else {
      const newShortcut: SystemShortcut = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setShortcuts(prev => [...prev, newShortcut]);
      
      // Update category count
      setCategories(prev => prev.map(cat => 
        cat.name === formData.category 
          ? { ...cat, shortcut_count: cat.shortcut_count + 1 }
          : cat
      ));
    }
    
    setFormData({ shortcut: '', expansion: '', category: '', description: '', is_active: true });
    setShowAddForm(false);
    setEditingShortcut(null);
  };

  // Handle category form submission
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isDuplicate = categories.some(c => 
      c.name === categoryFormData.name && c.id !== editingCategory?.id
    );
    
    if (isDuplicate) {
      alert(`הקטגוריה "${categoryFormData.name}" כבר קיימת!`);
      return;
    }
    
    if (editingCategory) {
      setCategories(prev => prev.map(c => 
        c.id === editingCategory.id 
          ? { ...c, ...categoryFormData }
          : c
      ));
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        ...categoryFormData,
        shortcut_count: 0
      };
      setCategories(prev => [...prev, newCategory]);
    }
    
    setCategoryFormData({ name: '', label: '', is_active: true });
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  // Filter shortcuts
  const filteredShortcuts = shortcuts.filter(s => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return s.shortcut.toLowerCase().includes(search) ||
             s.expansion.toLowerCase().includes(search) ||
             s.description?.toLowerCase().includes(search);
    }
    return true;
  });

  return (
    <div className="shortcuts-admin-container">
      <div className="admin-header">
        <h1>ניהול קיצורי מערכת</h1>
        <div className="header-stats">
          <span>{shortcuts.length} קיצורים</span>
          <span>{categories.length} קטגוריות</span>
          <span>{shortcuts.filter(s => s.is_active).length} פעילים</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shortcuts')}
        >
          📝 קיצורים
        </button>
        <button 
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          📁 קטגוריות
        </button>
        <button 
          className={`tab-btn ${activeTab === 'conflicts' ? 'active' : ''}`}
          onClick={() => setActiveTab('conflicts')}
        >
          ⚠️ התנגשויות
        </button>
      </div>

      {loading && <div className="loading">טוען...</div>}

      {/* Shortcuts Tab */}
      {!loading && activeTab === 'shortcuts' && (
        <>
          <div className="admin-controls">
            <div className="control-row">
              <button 
                className="add-btn"
                onClick={() => {
                  setEditingShortcut(null);
                  setFormData({ shortcut: '', expansion: '', category: '', description: '', is_active: true });
                  setShowAddForm(true);
                }}
              >
                + הוסף קיצור
              </button>
              
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="category-filter"
              >
                <option value="all">כל הקטגוריות</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.label} ({cat.shortcut_count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="shortcuts-table">
            <table>
              <thead>
                <tr>
                  <th>קיצור</th>
                  <th>טקסט מלא</th>
                  <th>קטגוריה</th>
                  <th>תיאור</th>
                  <th>פעיל</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredShortcuts.map(shortcut => (
                  <tr key={shortcut.id}>
                    <td className="shortcut-cell">{shortcut.shortcut}</td>
                    <td>{shortcut.expansion}</td>
                    <td>
                      <span className="category-badge">
                        {categories.find(c => c.name === shortcut.category)?.label || shortcut.category}
                      </span>
                    </td>
                    <td>{shortcut.description || '-'}</td>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={shortcut.is_active}
                        onChange={() => {
                          setShortcuts(prev => prev.map(s => 
                            s.id === shortcut.id 
                              ? { ...s, is_active: !s.is_active }
                              : s
                          ));
                        }}
                      />
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="edit-btn"
                        onClick={() => {
                          setEditingShortcut(shortcut);
                          setFormData({
                            shortcut: shortcut.shortcut,
                            expansion: shortcut.expansion,
                            category: shortcut.category,
                            description: shortcut.description || '',
                            is_active: shortcut.is_active
                          });
                          setShowAddForm(true);
                        }}
                      >
                        ערוך
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => {
                          if (confirm('למחוק קיצור זה?')) {
                            setShortcuts(prev => prev.filter(s => s.id !== shortcut.id));
                            // Update category count
                            setCategories(prev => prev.map(cat => 
                              cat.name === shortcut.category 
                                ? { ...cat, shortcut_count: Math.max(0, cat.shortcut_count - 1) }
                                : cat
                            ));
                          }
                        }}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredShortcuts.length === 0 && (
              <div className="no-results">לא נמצאו קיצורים</div>
            )}
          </div>
        </>
      )}

      {/* Categories Tab */}
      {!loading && activeTab === 'categories' && (
        <>
          <div className="admin-controls">
            <button 
              className="add-btn"
              onClick={() => {
                setEditingCategory(null);
                setCategoryFormData({ name: '', label: '', is_active: true });
                setShowCategoryForm(true);
              }}
            >
              + הוסף קטגוריה
            </button>
          </div>

          <div className="categories-table">
            <table>
              <thead>
                <tr>
                  <th>שם מערכת</th>
                  <th>תווית</th>
                  <th>מספר קיצורים</th>
                  <th>פעיל</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.id}>
                    <td className="code-cell">{category.name}</td>
                    <td>{category.label}</td>
                    <td>{category.shortcut_count}</td>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={category.is_active}
                        onChange={() => {
                          setCategories(prev => prev.map(c => 
                            c.id === category.id 
                              ? { ...c, is_active: !c.is_active }
                              : c
                          ));
                        }}
                      />
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="edit-btn"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryFormData({
                            name: category.name,
                            label: category.label,
                            is_active: category.is_active
                          });
                          setShowCategoryForm(true);
                        }}
                      >
                        ערוך
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => {
                          if (category.shortcut_count > 0) {
                            alert(`לא ניתן למחוק קטגוריה עם ${category.shortcut_count} קיצורים`);
                            return;
                          }
                          if (confirm('למחוק קטגוריה זו?')) {
                            setCategories(prev => prev.filter(c => c.id !== category.id));
                          }
                        }}
                        disabled={category.shortcut_count > 0}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Conflicts Tab */}
      {!loading && activeTab === 'conflicts' && (
        <div className="conflicts-section">
          <div className="info-message">
            <h3>ניהול התנגשויות</h3>
            <p>כאשר קיצור מערכת מתנגש עם קיצור אישי של משתמש, המערכת תציע אלטרנטיבות.</p>
            <p>כרגע אין התנגשויות במערכת.</p>
          </div>
        </div>
      )}

      {/* Shortcut Form Modal */}
      {showAddForm && (
        <div className="form-overlay" onClick={() => setShowAddForm(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <h3>{editingShortcut ? 'עריכת קיצור' : 'הוספת קיצור'}</h3>
            <form onSubmit={handleShortcutSubmit}>
              <div className="form-group">
                <label>קיצור:</label>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={e => setFormData(prev => ({ ...prev, shortcut: e.target.value }))}
                  required
                  maxLength={20}
                />
              </div>
              
              <div className="form-group">
                <label>טקסט מלא:</label>
                <textarea
                  value={formData.expansion}
                  onChange={e => setFormData(prev => ({ ...prev, expansion: e.target.value }))}
                  required
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label>קטגוריה:</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  required
                >
                  <option value="">בחר קטגוריה</option>
                  {categories.filter(c => c.is_active).map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>תיאור:</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  פעיל באפליקציה
                </label>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)}>
                  ביטול
                </button>
                <button type="submit">
                  {editingShortcut ? 'עדכן' : 'הוסף'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="form-overlay" onClick={() => setShowCategoryForm(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <h3>{editingCategory ? 'עריכת קטגוריה' : 'הוספת קטגוריה'}</h3>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label>שם מערכת (באנגלית):</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  required
                  pattern="[a-z_]+"
                  placeholder="לדוגמה: legal"
                />
              </div>
              
              <div className="form-group">
                <label>תווית (בעברית):</label>
                <input
                  type="text"
                  value={categoryFormData.label}
                  onChange={e => setCategoryFormData(prev => ({ ...prev, label: e.target.value }))}
                  required
                  placeholder="לדוגמה: משפטי"
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={categoryFormData.is_active}
                    onChange={e => setCategoryFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  פעיל באפליקציה
                </label>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowCategoryForm(false)}>
                  ביטול
                </button>
                <button type="submit">
                  {editingCategory ? 'עדכן' : 'הוסף'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}