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
      // First try to load from public API for reading
      const publicResponse = await fetch('http://localhost:5000/api/transcription/shortcuts/public');
      
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        
        // Process shortcuts from public API
        const systemShortcuts: SystemShortcut[] = [];
        let idCounter = 1;
        
        publicData.shortcuts.forEach(([shortcut, data]: [string, any]) => {
          if (data.source === 'system') {
            systemShortcuts.push({
              id: String(idCounter++),
              shortcut: shortcut,
              expansion: data.expansion,
              category: data.category || 'common',
              description: data.description,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        });
        
        // Process categories with labels for display
        const categoryLabels: { [key: string]: string } = {
          legal: 'משפטי',
          medical: 'רפואי',
          common: 'ביטויים נפוצים',
          academic: 'אקדמי',
          business: 'עסקי',
          technical: 'טכני',
          english: 'מילים באנגלית',
          punctuation: 'סימני פיסוק'
        };
        
        const categoriesData: Category[] = publicData.categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          label: categoryLabels[c.name] || c.name,
          shortcut_count: systemShortcuts.filter(s => s.category === c.name).length,
          is_active: true
        }));
        
        setShortcuts(systemShortcuts);
        setCategories(categoriesData.length > 0 ? categoriesData : getDefaultCategories());
        setError('');
      } else {
        // Fallback to empty data
        setCategories(getDefaultCategories());
        setShortcuts([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('שגיאה בטעינת הנתונים');
      setCategories(getDefaultCategories());
      setShortcuts([]);
    } finally {
      setLoading(false);
    }
  };
  
  const getDefaultCategories = (): Category[] => {
    return [
      { id: '1', name: 'legal', label: 'משפטי', shortcut_count: 0, is_active: true },
      { id: '2', name: 'medical', label: 'רפואי', shortcut_count: 0, is_active: true },
      { id: '3', name: 'punctuation', label: 'סימני פיסוק', shortcut_count: 0, is_active: true },
      { id: '4', name: 'common', label: 'ביטויים נפוצים', shortcut_count: 0, is_active: true },
      { id: '5', name: 'business', label: 'עסקי', shortcut_count: 0, is_active: true },
      { id: '6', name: 'academic', label: 'אקדמי', shortcut_count: 0, is_active: true },
      { id: '7', name: 'technical', label: 'טכני', shortcut_count: 0, is_active: true },
      { id: '8', name: 'english', label: 'מילים באנגלית', shortcut_count: 0, is_active: true }
    ];
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
    
    try {
      if (editingShortcut) {
        // Update existing shortcut - use dev endpoint
        const response = await fetch(`http://localhost:5000/dev/admin/shortcuts/${editingShortcut.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            originalShortcut: editingShortcut.shortcut // Pass original shortcut to find in DB
          })
        });
        
        if (response.ok) {
          await loadData(); // Reload data from server
        } else {
          const error = await response.json();
          alert(`שגיאה: ${error.error}`);
          return;
        }
      } else {
        // Add new shortcut - use dev endpoint
        const response = await fetch('http://localhost:5000/dev/admin/shortcuts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          await loadData(); // Reload data from server
        } else {
          const error = await response.json();
          // Check for duplicates locally
          const isDuplicate = shortcuts.some(s => s.shortcut === formData.shortcut);
          if (isDuplicate) {
            const suggestion = generateSuggestion(formData.shortcut);
            if (confirm(`הקיצור "${formData.shortcut}" כבר קיים!\n\nהצעה חלופית: "${suggestion}"\n\nהאם להשתמש בהצעה?`)) {
              formData.shortcut = suggestion;
              await handleShortcutSubmit(e); // Retry with suggestion
              return;
            }
          } else {
            alert(`שגיאה: ${error.error}`);
          }
          return;
        }
      }
      
      setFormData({ shortcut: '', expansion: '', category: '', description: '', is_active: true });
      setShowAddForm(false);
      setEditingShortcut(null);
    } catch (error) {
      console.error('Error saving shortcut:', error);
      alert('שגיאה בשמירת הקיצור');
    }
  };

  // Handle category form submission
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // For now, just add to local state since we don't have a label column in DB
      // Categories will be created automatically when shortcuts are added to them
      
      if (editingCategory) {
        // Update locally
        setCategories(prev => prev.map(c => 
          c.id === editingCategory.id 
            ? { ...c, ...categoryFormData }
            : c
        ));
      } else {
        // Add new category - use dev endpoint
        const response = await fetch('http://localhost:5000/dev/admin/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(categoryFormData)
        });
        
        if (!response.ok) {
          // If fails, just add locally
          const newCategory: Category = {
            id: Date.now().toString(),
            ...categoryFormData,
            shortcut_count: 0
          };
          setCategories(prev => [...prev, newCategory]);
        }
        
        // If we're adding a category from the shortcut form, select it automatically
        if (showAddForm) {
          setFormData(prev => ({ ...prev, category: categoryFormData.name }));
        }
      }
      
      await loadData(); // Reload data from server
      setCategoryFormData({ name: '', label: '', is_active: true });
      setShowCategoryForm(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      // Just add locally if error
      const newCategory: Category = {
        id: Date.now().toString(),
        ...categoryFormData,
        shortcut_count: 0
      };
      setCategories(prev => [...prev, newCategory]);
      
      if (showAddForm) {
        setFormData(prev => ({ ...prev, category: categoryFormData.name }));
      }
      
      setCategoryFormData({ name: '', label: '', is_active: true });
      setShowCategoryForm(false);
      setEditingCategory(null);
    }
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
                        onClick={async () => {
                          if (confirm('למחוק קיצור זה?')) {
                            try {
                              // Use the shortcut text as identifier for deletion
                              const response = await fetch(`http://localhost:5000/dev/admin/shortcuts/${encodeURIComponent(shortcut.shortcut)}`, {
                                method: 'DELETE',
                                headers: {
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              if (response.ok) {
                                await loadData(); // Reload data from server
                              } else {
                                const error = await response.json();
                                alert(`שגיאה במחיקה: ${error.error}`);
                              }
                            } catch (error) {
                              console.error('Error deleting shortcut:', error);
                              alert('שגיאה במחיקת הקיצור');
                            }
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
                  onChange={e => {
                    const value = e.target.value;
                    if (value === '__new__') {
                      // Open category form to add new category
                      setShowCategoryForm(true);
                      setEditingCategory(null);
                      setCategoryFormData({ name: '', label: '', is_active: true });
                    } else {
                      setFormData(prev => ({ ...prev, category: value }));
                    }
                  }}
                  required
                >
                  <option value="">בחר קטגוריה</option>
                  {categories.filter(c => c.is_active).map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.label}
                    </option>
                  ))}
                  <option value="__new__" style={{ fontWeight: 'bold', borderTop: '1px solid #ddd' }}>
                    + הוסף קטגוריה חדשה
                  </option>
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
              
              <div className="form-group checkbox-inline">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <label htmlFor="is_active_checkbox">פעיל באפליקציה</label>
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