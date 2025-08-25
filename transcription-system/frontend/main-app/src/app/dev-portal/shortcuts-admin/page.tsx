'use client';

import React, { useState, useEffect } from 'react';
import './shortcuts-admin.css';
import { getApiUrl } from '@/utils/api';

interface SystemShortcut {
  id: string;
  shortcut: string;
  expansion: string;
  category: string;
  categories?: string[]; // Multiple categories support
  primary_category?: string; // Primary category for multi-category shortcuts
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

interface TransformationRule {
  id: string;
  category_name: string;
  prefix: string;
  suffix: string;
  context_type: 'space' | 'comma' | 'period' | 'any';
  priority: number;
  is_active: boolean;
  example_before?: string;
  example_after?: string;
}

interface ShortcutException {
  id: string;
  shortcut_id: string;
  shortcut_text?: string;
  exception_type: 'no_transform' | 'custom_transform' | 'priority_override';
  custom_transformation?: string;
  override_priority?: number;
  notes?: string;
  is_active: boolean;
}

type TabType = 'shortcuts' | 'categories' | 'conflicts' | 'transformations' | 'exceptions';

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

export default function ShortcutsAdminPage() {
  console.log('ShortcutsAdminPage rendering');
  
  const [activeTab, setActiveTab] = useState<TabType>('shortcuts');
  const [shortcuts, setShortcuts] = useState<SystemShortcut[]>([]);
  const [categories, setCategories] = useState<Category[]>(getDefaultCategories());
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
    categories: [] as string[], // Multiple categories
    primary_category: '', // Primary category
    description: '',
    is_active: true
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    label: '',
    is_active: true
  });
  const [selectedShortcuts, setSelectedShortcuts] = useState<Set<string>>(new Set());
  const [transformations, setTransformations] = useState<TransformationRule[]>([]);
  const [editingTransformation, setEditingTransformation] = useState<TransformationRule | null>(null);
  const [shortcutTestInput, setShortcutTestInput] = useState('');
  const [shortcutTestResult, setShortcutTestResult] = useState('');
  const [transformTestInput, setTransformTestInput] = useState('');
  const [transformTestResult, setTransformTestResult] = useState('');
  const [transformationForm, setTransformationForm] = useState({
    category_name: '',
    prefix: '',
    suffix: '',
    transformation_template: '{prefix}- {expansion}', // Template for how to transform
    context_type: 'any' as 'space' | 'comma' | 'period' | 'any',
    priority: 1,
    is_active: true,
    example_before: '',
    example_after: ''
  });
  const [exceptions, setExceptions] = useState<ShortcutException[]>([]);
  const [editingException, setEditingException] = useState<ShortcutException | null>(null);
  const [exceptionForm, setExceptionForm] = useState({
    shortcut_id: '',
    shortcut_text: '',
    exception_type: 'no_transform' as 'no_transform' | 'custom_transform' | 'priority_override',
    custom_transformation: '',
    override_priority: 1,
    notes: '',
    is_active: true
  });

  // Load data on mount
  // Helper function to get correct API URL for dev endpoints
  const getDevApiUrl = (endpoint: string) => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // In production, nginx proxies /api to backend port 5000
      return `/api${endpoint}`;
    }
    // In localhost, use direct URL
    return `${getApiUrl()}${endpoint}`;
  };

  useEffect(() => {
    console.log('useEffect - loading data');
    loadData();
    loadTransformations();
  }, []);
  
  // Load transformations
  const loadTransformations = async () => {
    try {
      const response = await fetch(getDevApiUrl('/dev/admin/advanced/transformations'));
      if (response.ok) {
        const data = await response.json();
        // Map backend data to our frontend format
        const mappedTransformations = data.map((t: any) => ({
          id: t.id,
          category_name: t.category_name || 'unknown',
          prefix: t.prefix || '',
          suffix: t.suffix || '',
          context_type: 
            (!t.apply_with_space && !t.apply_with_comma && !t.apply_with_period) ? 'any' :
            t.apply_with_space && !t.apply_with_comma && !t.apply_with_period ? 'space' :
            !t.apply_with_space && t.apply_with_comma && !t.apply_with_period ? 'comma' :
            !t.apply_with_space && !t.apply_with_comma && t.apply_with_period ? 'period' : 'any',
          priority: t.priority || 1,
          is_active: t.is_active !== false,
          example_before: t.example_before || '',
          example_after: t.example_after || ''
        }));
        setTransformations(mappedTransformations);
        console.log('Loaded transformations:', mappedTransformations);
      }
    } catch (error) {
      console.error('Error loading transformations:', error);
    }
  };

  const loadData = async () => {
    console.log('loadData called');
    setLoading(true);
    try {
      // Set timeout for fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Aborting fetch due to timeout');
        controller.abort();
      }, 5000); // 5 second timeout
      
      console.log('Fetching from:', `${getApiUrl()}/api/transcription/shortcuts/public`);
      const publicResponse = await fetch(`${getApiUrl()}/api/transcription/shortcuts/public`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Fetch completed, status:', publicResponse.status);
      
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        
        // Process shortcuts from public API
        const systemShortcuts: SystemShortcut[] = [];
        let idCounter = 1;
        
        if (publicData.shortcuts && Array.isArray(publicData.shortcuts)) {
          publicData.shortcuts.forEach(([shortcut, data]: [string, any]) => {
            if (data && data.source === 'system') {
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
        }
        
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
        
        const categoriesData: Category[] = publicData.categories ? publicData.categories.map((c: any) => ({
          id: c.id || String(Math.random()),
          name: c.name,
          label: categoryLabels[c.name] || c.name,
          shortcut_count: systemShortcuts.filter(s => s.category === c.name).length,
          is_active: true
        })) : [];
        
        setShortcuts(systemShortcuts);
        setCategories(categoriesData.length > 0 ? categoriesData : getDefaultCategories());
        setError('');
      } else {
        console.log('Response not ok, using defaults');
        setCategories(getDefaultCategories());
        setShortcuts([]);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      if (err.name === 'AbortError') {
        setError('הבקשה לקחה יותר מדי זמן - משתמש בנתוני ברירת מחדל');
      } else {
        setError('שגיאה בטעינת הנתונים');
      }
      setCategories(getDefaultCategories());
      setShortcuts([]);
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
  const handleShortcutSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    try {
      // Prepare the data with multiple categories support
      const submitData = {
        ...formData,
        // Ensure we have at least the primary category
        category: formData.primary_category || formData.category || formData.categories[0] || '',
        // Send categories array for advanced API
        categories: formData.categories.length > 0 ? formData.categories : (formData.category ? [formData.category] : []),
        primary_category: formData.primary_category || formData.categories[0] || formData.category || ''
      };
      
      if (editingShortcut) {
        // Update existing shortcut - use dev endpoint
        const response = await fetch(getDevApiUrl(`/dev/admin/shortcuts/${editingShortcut.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...submitData,
            originalShortcut: editingShortcut.shortcut // Pass original shortcut to find in DB
          })
        });
        
        if (response.ok) {
          // If we have multiple categories, also update via advanced endpoint
          if (submitData.categories.length > 1) {
            await fetch(getDevApiUrl(`/dev/admin/advanced/shortcuts/${editingShortcut.id}/categories`), {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                categories: submitData.categories,
                primary_category: submitData.primary_category
              })
            });
          }
          await loadData(); // Reload data from server
        } else {
          const error = await response.json();
          alert('שגיאה: ' + error.error);
          return;
        }
      } else {
        // Add new shortcut - use dev endpoint
        const response = await fetch(getDevApiUrl('/dev/admin/shortcuts'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submitData)
        });
        
        if (response.ok) {
          const newShortcut = await response.json();
          
          // Show success message with variations count
          if (newShortcut.variations_created > 0) {
            alert(`✅ קיצור נוסף בהצלחה!\n📋 נוצרו ${newShortcut.variations_created} וריאציות אוטומטיות (ו${formData.shortcut}, ב${formData.shortcut}, ל${formData.shortcut}, וכו')`);
          }
          
          // If we have multiple categories, also update via advanced endpoint
          if (submitData.categories.length > 1 && newShortcut.id) {
            await fetch(getDevApiUrl(`/dev/admin/advanced/shortcuts/${newShortcut.id}/categories`), {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                categories: submitData.categories,
                primary_category: submitData.primary_category
              })
            });
          }
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
            alert('שגיאה: ' + error.error);
          }
          return;
        }
      }
      
      setFormData({ shortcut: '', expansion: '', category: '', categories: [], primary_category: '', description: '', is_active: true });
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
        const response = await fetch(getDevApiUrl('/dev/admin/categories'), {
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

  // Debug - show simple content first
  if (loading) {
    return (
      <div className="shortcuts-admin-container">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>טוען נתונים...</h2>
          <p>אם הטעינה נמשכת יותר מדי זמן, יש בעיה בחיבור לשרת</p>
          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="shortcuts-admin-container">
      <div className="admin-header">
        <div className="header-main">
          <h1>ניהול קיצורי מערכת</h1>
          <button 
            className="back-btn"
            onClick={() => window.location.href = '/transcription'}
          >
            ← חזרה לתמלול
          </button>
        </div>
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
          className={'tab-btn ' + (activeTab === 'categories' ? 'active' : '')}
          onClick={() => setActiveTab('categories')}
        >
          📁 קטגוריות
        </button>
        <button 
          className={'tab-btn ' + (activeTab === 'conflicts' ? 'active' : '')}
          onClick={() => setActiveTab('conflicts')}
        >
          ⚠️ התנגשויות
        </button>
        <button 
          className={'tab-btn ' + (activeTab === 'transformations' ? 'active' : '')}
          onClick={() => setActiveTab('transformations')}
        >
          🔄 חוקי המרה
        </button>
        <button 
          className={'tab-btn ' + (activeTab === 'exceptions' ? 'active' : '')}
          onClick={() => setActiveTab('exceptions')}
        >
          ⚠️ חריגים
        </button>
      </div>

      {loading && <div className="loading">טוען...</div>}

      {/* Shortcuts Tab */}
      {!loading && activeTab === 'shortcuts' && (
        <>
          <div className="admin-controls">
            {/* Always visible input form */}
            <div className="inline-add-form">
              <input
                type="text"
                placeholder="קיצור"
                value={formData.shortcut}
                onChange={e => setFormData(prev => ({ ...prev, shortcut: e.target.value }))}
                className="form-input shortcut-input"
              />
              <input
                type="text"
                placeholder="טקסט מלא"
                value={formData.expansion}
                onChange={e => setFormData(prev => ({ ...prev, expansion: e.target.value }))}
                className="form-input expansion-input"
              />
              <div className="multi-category-select">
                <div className="selected-categories">
                  {formData.categories.length > 0 ? (
                    formData.categories.map(catName => {
                      const cat = categories.find(c => c.name === catName);
                      return cat ? (
                        <span 
                          key={catName} 
                          className="category-chip"
                          onClick={() => {
                            // Set as primary category on click
                            if (formData.categories.length > 1) {
                              setFormData(prev => ({
                                ...prev,
                                primary_category: catName,
                                category: catName // Keep backward compatibility
                              }));
                            }
                          }}
                          style={{ cursor: formData.categories.length > 1 ? 'pointer' : 'default' }}
                          title={formData.categories.length > 1 ? 'לחץ להגדרה כקטגוריה ראשית' : ''}
                        >
                          {cat.label}
                          {formData.primary_category === catName && <span className="primary-indicator">★</span>}
                          <button
                            type="button"
                            className="remove-category"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering the parent click
                              const newCategories = formData.categories.filter(c => c !== catName);
                              setFormData(prev => ({
                                ...prev,
                                categories: newCategories,
                                primary_category: prev.primary_category === catName ? newCategories[0] || '' : prev.primary_category,
                                category: newCategories[0] || '' // Keep backward compatibility
                              }));
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="placeholder-text">בחר קטגוריות (אופציונלי)...</span>
                  )}
                </div>
                <select
                  value=""
                  onChange={e => {
                    const catName = e.target.value;
                    if (catName && !formData.categories.includes(catName)) {
                      const newCategories = [...formData.categories, catName];
                      setFormData(prev => ({
                        ...prev,
                        categories: newCategories,
                        primary_category: prev.primary_category || catName, // Set first as primary
                        category: catName // Keep backward compatibility
                      }));
                    }
                  }}
                  className="form-input category-dropdown"
                >
                  <option value="">+ הוסף קטגוריה</option>
                  {categories
                    .filter(c => c.is_active && !formData.categories.includes(c.name))
                    .map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.label}
                      </option>
                    ))}
                </select>
              </div>
              <button
                className="add-btn inline-add-btn"
                onClick={() => handleShortcutSubmit()}
                disabled={!formData.shortcut || !formData.expansion}
              >
                {editingShortcut ? 'עדכן' : 'הוסף'}
              </button>
              {editingShortcut && (
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setEditingShortcut(null);
                    setFormData({ shortcut: '', expansion: '', category: '', categories: [], primary_category: '', description: '', is_active: true });
                  }}
                >
                  ביטול
                </button>
              )}
            </div>
            
            <div className="control-row">
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
            
            {/* Real-time Test Section for Shortcuts */}
            <div className="test-section">
              <h4>בדיקת קיצורים בזמן אמת</h4>
              
              {/* Example buttons */}
              <div className="example-buttons">
                <span>דוגמאות מהירות:</span>
                <button 
                  className="example-btn"
                  onClick={() => setShortcutTestInput('שלחתי לו הודעה בוואטסאפ ע"י הטלפון')}
                >
                  וואטסאפ + ע"י
                </button>
                <button 
                  className="example-btn"
                  onClick={() => setShortcutTestInput('הנתבע טען כי המסמך נשלח ע"י דוא"ל')}
                >
                  משפטי
                </button>
                <button 
                  className="example-btn"
                  onClick={() => setShortcutTestInput('ד"ר כהן אמר שהבדיקה תיערך ע"י האח"מ')}
                >
                  רפואי
                </button>
              </div>
              
              <div className="test-typing-container">
                <div className="typing-field">
                  <label>הקלד טקסט:</label>
                  <textarea
                    placeholder="התחל להקליד... הקיצורים יוחלפו אוטומטית (לדוגמה: נסה להקליד ע'י או וואטסאפ)"
                    value={shortcutTestInput}
                    onChange={e => {
                      const text = e.target.value;
                      setShortcutTestInput(text);
                      
                      // Apply shortcuts in real-time with smart detection
                      let transformed = text;
                      const appliedList: any[] = [];
                      
                      // Function to escape regex special characters
                      const escapeRegex = (str: string) => {
                        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      };
                      
                      // Process each shortcut to find matches
                      shortcuts.forEach(shortcut => {
                        if (!shortcut.is_active) return;
                        
                        try {
                          // Escape special characters in the shortcut
                          const escapedShortcut = escapeRegex(shortcut.shortcut);
                          
                          // Create regex to match the shortcut as a whole word
                          // Use word boundaries only if the shortcut starts/ends with word characters
                          const startsWithWord = /^\w/.test(shortcut.shortcut);
                          const endsWithWord = /\w$/.test(shortcut.shortcut);
                          
                          const pattern = 
                            (startsWithWord ? '\\b' : '') + 
                            escapedShortcut + 
                            (endsWithWord ? '\\b' : '');
                          
                          const regex = new RegExp(pattern, 'g');
                          
                          // Check if this shortcut exists in the text
                          if (regex.test(text)) {
                            appliedList.push(shortcut);
                            // Replace all occurrences
                            transformed = transformed.replace(
                              new RegExp(pattern, 'g'), 
                              shortcut.expansion
                            );
                          }
                        } catch (e) {
                          console.error('Error processing shortcut:', shortcut.shortcut, e);
                        }
                      });
                      
                      setShortcutTestResult(transformed);
                    }}
                    className="typing-input"
                    rows={3}
                  />
                </div>
                <div className="typing-field">
                  <label>תוצאה מעובדת:</label>
                  <div className="typing-output">
                    {shortcutTestResult || shortcutTestInput || '(הטקסט המעובד יופיע כאן)'}
                  </div>
                </div>
              </div>
              <div className="applied-shortcuts">
                {shortcutTestInput && (() => {
                  const appliedShortcuts: any[] = [];
                  
                  // Find which shortcuts were applied
                  shortcuts.forEach(shortcut => {
                    if (!shortcut.is_active) return;
                    
                    // Simple check if the shortcut text exists in the input
                    if (shortcutTestInput.includes(shortcut.shortcut)) {
                      appliedShortcuts.push(shortcut);
                    }
                  });
                  
                  return appliedShortcuts.length > 0 ? (
                    <>
                      <strong>קיצורים שזוהו:</strong>
                      {appliedShortcuts.map((s, i) => (
                        <span key={i} className="shortcut-tag">
                          {s.shortcut} → {s.expansion}
                        </span>
                      ))}
                    </>
                  ) : null;
                })()}
              </div>
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
                      {(shortcut.categories && shortcut.categories.length > 0) ? (
                        <div className="categories-cell">
                          {shortcut.categories.map(catName => {
                            const cat = categories.find(c => c.name === catName);
                            return cat ? (
                              <span 
                                key={catName} 
                                className={`category-badge ${shortcut.primary_category === catName ? 'primary' : ''}`}
                                title={shortcut.primary_category === catName ? 'קטגוריה ראשית' : ''}
                              >
                                {cat.label}
                                {shortcut.primary_category === catName && <span className="primary-star">★</span>}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <span className="category-badge">
                          {categories.find(c => c.name === shortcut.category)?.label || shortcut.category || '-'}
                        </span>
                      )}
                    </td>
                    <td>{shortcut.description || '-'}</td>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={shortcut.is_active}
                        onChange={async () => {
                          // Update local state immediately for UI responsiveness
                          const newIsActive = !shortcut.is_active;
                          setShortcuts(prev => prev.map(s => 
                            s.id === shortcut.id 
                              ? { ...s, is_active: newIsActive }
                              : s
                          ));
                          
                          // Update in database
                          try {
                            const response = await fetch(getDevApiUrl(`/dev/admin/shortcuts/${shortcut.id}`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                originalShortcut: shortcut.shortcut,
                                is_active: newIsActive
                              })
                            });
                            
                            if (!response.ok) {
                              // Revert on error
                              setShortcuts(prev => prev.map(s => 
                                s.id === shortcut.id 
                                  ? { ...s, is_active: !newIsActive }
                                  : s
                              ));
                              alert('שגיאה בעדכון סטטוס הקיצור');
                            }
                          } catch (error) {
                            console.error('Error updating shortcut status:', error);
                            // Revert on error
                            setShortcuts(prev => prev.map(s => 
                              s.id === shortcut.id 
                                ? { ...s, is_active: !newIsActive }
                                : s
                            ));
                            alert('שגיאה בעדכון סטטוס הקיצור');
                          }
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
                            categories: shortcut.categories || (shortcut.category ? [shortcut.category] : []),
                            primary_category: shortcut.primary_category || shortcut.category || '',
                            description: shortcut.description || '',
                            is_active: shortcut.is_active
                          });
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
                              const response = await fetch(getDevApiUrl(`/dev/admin/shortcuts/${encodeURIComponent(shortcut.shortcut)}`), {
                                method: 'DELETE',
                                headers: {
                                  'Content-Type': 'application/json'
                                }
                              });
                              
                              if (response.ok) {
                                await loadData(); // Reload data from server
                              } else {
                                const error = await response.json();
                                alert('שגיאה במחיקה: ' + error.error);
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
                            alert('לא ניתן למחוק קטגוריה עם ' + category.shortcut_count + ' קיצורים');
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

      {/* Transformations Tab */}
      {!loading && activeTab === 'transformations' && (
        <>
          <div className="admin-controls">
            <div className="transformation-form">
              <h3>{editingTransformation ? 'עריכת חוק המרה' : 'הוספת חוק המרה'}</h3>
              <div className="form-row">
                <select
                  value={transformationForm.category_name}
                  onChange={e => {
                    const categoryName = e.target.value;
                    setTransformationForm(prev => ({ 
                      ...prev, 
                      category_name: categoryName,
                      // Set default template based on category
                      transformation_template: categoryName === 'english' 
                        ? '{prefix}- {expansion}' 
                        : '{prefix}{expansion}'
                    }));
                  }}
                  className="form-input"
                >
                  <option value="">בחר קטגוריה</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                
                <input
                  type="text"
                  placeholder="תחילית (לדוגמה: ו, ב, ל - רק התחילית בעברית)"
                  value={transformationForm.prefix}
                  onChange={e => setTransformationForm(prev => ({ ...prev, prefix: e.target.value }))}
                  className="form-input"
                  title="הכנס רק את התחילית העברית (ו, ב, ל וכו'). התבנית תקבע איך זה יוצג"
                />
                
                <input
                  type="text"
                  placeholder="סיומת (לדוגמה: , או .)"
                  value={transformationForm.suffix}
                  onChange={e => setTransformationForm(prev => ({ ...prev, suffix: e.target.value }))}
                  className="form-input"
                  title="ניתן להוסיף כל טקסט כולל רווחים ומקפים"
                />
                
                <input
                  type="text"
                  placeholder="תבנית המרה (לדוגמה: {prefix}- {expansion})"
                  value={transformationForm.transformation_template}
                  onChange={e => setTransformationForm(prev => ({ ...prev, transformation_template: e.target.value }))}
                  className="form-input"
                  title="השתמש ב-{prefix}, {suffix}, {expansion} כמשתנים. לדוגמה: '{prefix}- {expansion}' עבור אנגלית או '{prefix}{expansion}' עבור עברית"
                />
                
                <select
                  value={transformationForm.context_type}
                  onChange={e => setTransformationForm(prev => ({ ...prev, context_type: e.target.value as any }))}
                  className="form-input"
                >
                  <option value="any">כל הקשר</option>
                  <option value="space">אחרי רווח</option>
                  <option value="comma">אחרי פסיק</option>
                  <option value="period">אחרי נקודה</option>
                </select>
                
                <div className="priority-field">
                  <label>עדיפות:</label>
                  <input
                    type="number"
                    value={transformationForm.priority}
                    onChange={e => setTransformationForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                    className="form-input priority-input"
                    min="1"
                    max="10"
                    title="מספר גבוה יותר = עדיפות גבוהה יותר"
                  />
                </div>
                
                <button
                  className="add-btn"
                  onClick={async () => {
                    try {
                      if (editingTransformation) {
                        // Update existing transformation
                        const response = await fetch(getDevApiUrl(`/dev/admin/advanced/transformations/${editingTransformation.id}`), {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(transformationForm)
                        });
                        
                        if (response.ok) {
                          setTransformations(prev => prev.map(t => 
                            t.id === editingTransformation.id ? { ...t, ...transformationForm } : t
                          ));
                          setEditingTransformation(null);
                        }
                      } else {
                        // Add new transformation
                        // First get category ID from category name
                        const category = categories.find(c => c.name === transformationForm.category_name);
                        if (!category) {
                          alert('קטגוריה לא נמצאה');
                          return;
                        }
                        
                        // Map our form data to backend format
                        const backendData = {
                          category_id: category.id,
                          prefix: transformationForm.prefix || null,
                          suffix: transformationForm.suffix || null,
                          transformation_template: transformationForm.transformation_template || null,
                          apply_with_space: transformationForm.context_type === 'space' || transformationForm.context_type === 'any',
                          apply_with_comma: transformationForm.context_type === 'comma' || transformationForm.context_type === 'any',
                          apply_with_period: transformationForm.context_type === 'period' || transformationForm.context_type === 'any',
                          transformation_type: 'standard',
                          priority: transformationForm.priority,
                          is_active: transformationForm.is_active
                        };
                        
                        const response = await fetch(getDevApiUrl('/dev/admin/advanced/transformations'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(backendData)
                        });
                        
                        if (response.ok) {
                          // Reload to get full data
                          await loadTransformations();
                        } else {
                          const error = await response.json();
                          console.error('Error adding transformation:', error);
                          alert('שגיאה בהוספת חוק המרה: ' + (error.error || 'Unknown error'));
                        }
                      }
                      
                      // Reset form
                      setTransformationForm({
                        category_name: '',
                        prefix: '',
                        suffix: '',
                        context_type: 'any',
                        priority: 1,
                        is_active: true,
                        example_before: '',
                        example_after: ''
                      });
                    } catch (error) {
                      console.error('Error saving transformation:', error);
                      alert('שגיאה בשמירת חוק ההמרה');
                    }
                  }}
                  disabled={!transformationForm.category_name || (!transformationForm.prefix && !transformationForm.suffix)}
                >
                  {editingTransformation ? 'עדכן' : 'הוסף חוק'}
                </button>
                
                {editingTransformation && (
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setEditingTransformation(null);
                      setTransformationForm({
                        category_name: '',
                        prefix: '',
                        suffix: '',
                        context_type: 'any',
                        priority: 1,
                        is_active: true,
                        example_before: '',
                        example_after: ''
                      });
                    }}
                  >
                    ביטול
                  </button>
                )}
              </div>
              
              <div className="form-row">
                <input
                  type="text"
                  placeholder="דוגמה לפני (אופציונלי)"
                  value={transformationForm.example_before}
                  onChange={e => setTransformationForm(prev => ({ ...prev, example_before: e.target.value }))}
                  className="form-input"
                />
                
                <input
                  type="text"
                  placeholder="דוגמה אחרי (אופציונלי)"
                  value={transformationForm.example_after}
                  onChange={e => setTransformationForm(prev => ({ ...prev, example_after: e.target.value }))}
                  className="form-input"
                />
              </div>
              
              {/* Live Preview */}
              {(transformationForm.prefix || transformationForm.suffix) && transformationForm.category_name && (
                <div className="transformation-preview">
                  <strong>תצוגה מקדימה:</strong>
                  <div className="preview-examples">
                    {transformationForm.prefix && (
                      <div className="preview-item">
                        <span>דוגמה:</span>
                        <span className="preview-text">
                          {transformationForm.category_name === 'english' ? (
                            <>ופייסבוק → <strong>
                              {transformationForm.transformation_template 
                                ? transformationForm.transformation_template
                                    .replace('{prefix}', transformationForm.prefix)
                                    .replace('{expansion}', 'Facebook')
                                : transformationForm.prefix + '- Facebook'
                              }
                            </strong></>
                          ) : (
                            <>וע'ד → <strong>
                              {transformationForm.transformation_template 
                                ? transformationForm.transformation_template
                                    .replace('{prefix}', transformationForm.prefix)
                                    .replace('{expansion}', 'עורך דין')
                                : transformationForm.prefix + 'עורך דין'
                              }
                            </strong></>
                          )}
                        </span>
                      </div>
                    )}
                    {transformationForm.suffix && (
                      <div className="preview-item">
                        <span>סיומת:</span>
                        <span className="preview-text">
                          מילה → מילה<strong>{transformationForm.suffix}</strong>
                        </span>
                      </div>
                    )}
                    <div className="preview-item">
                      <span>קטגוריה:</span>
                      <span>{categories.find(c => c.name === transformationForm.category_name)?.label}</span>
                    </div>
                    <div className="preview-item">
                      <span>הקשר:</span>
                      <span>
                        {transformationForm.context_type === 'space' ? 'אחרי רווח' :
                         transformationForm.context_type === 'comma' ? 'אחרי פסיק' :
                         transformationForm.context_type === 'period' ? 'אחרי נקודה' : 'תמיד'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Real-time Test Section for Transformations */}
            <div className="test-section">
              <h4>בדיקת חוקי המרה בזמן אמת</h4>
              
              {/* Quick Help */}
              <div className="transformation-help">
                <details>
                  <summary style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer' }}>
                    📖 איך משתמשים בחוקי המרה? (לחץ לפתיחה) ⚠️ חשוב לקרוא!
                  </summary>
                  <div className="help-content" style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                    <h5 style={{ color: '#dc2626' }}>🎯 הוראות שלב אחר שלב:</h5>
                    
                    <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                      <h6>דוגמה מעשית - מילים באנגלית:</h6>
                      <ol>
                        <li>בחר קטגוריה: <strong>english</strong></li>
                        <li>תחילית: <strong>ו</strong> (רק האות, בלי מקף!)</li>
                        <li>תבנית המרה: <strong>{'{prefix}- {expansion}'}</strong></li>
                        <li>לחץ "הוסף חוק"</li>
                      </ol>
                      <p>תוצאה: ופייסבוק → <strong>ו- Facebook</strong></p>
                    </div>
                    
                    <h5>הסבר השדות:</h5>
                    <ul>
                      <li><strong>תחילית:</strong> רק האות העברית (ו, ב, ל, מ, כ וכו')</li>
                      <li><strong>תבנית המרה:</strong> מגדיר איך התוצאה תיראה
                        <ul>
                          <li><code>{'{prefix}- {expansion}'}</code> = תחילית + מקף + רווח + המילה באנגלית</li>
                          <li><code>{'{prefix}{expansion}'}</code> = תחילית + המילה (בלי רווח)</li>
                        </ul>
                      </li>
                    </ul>
                    
                    <h5>סוגי הקשר:</h5>
                    <ul>
                      <li><strong>כל הקשר:</strong> תמיד מופעל</li>
                      <li><strong>אחרי רווח:</strong> רק כשיש רווח לפני המילה</li>
                      <li><strong>אחרי פסיק:</strong> רק אחרי פסיק</li>
                      <li><strong>אחרי נקודה:</strong> רק אחרי נקודה</li>
                    </ul>
                  </div>
                </details>
              </div>
              
              {/* Example buttons for transformations */}
              <div className="example-buttons">
                <span>נסה דוגמאות:</span>
                <button 
                  className="example-btn"
                  onClick={() => {
                    setTransformTestInput('דיברתי איתו WhatsApp ושלחתי לו את הקובץ');
                    // Also create a sample transformation if none exist
                    if (transformations.length === 0) {
                      alert('צור קודם חוק המרה: קטגוריה "english", תחילית "ב", הקשר "רווח"');
                    }
                  }}
                >
                  תחילית למילים באנגלית
                </button>
                <button 
                  className="example-btn"
                  onClick={() => setTransformTestInput('הנתבע אמר שהוא לא אשם והתובע טען אחרת')}
                >
                  סיומת למונחים משפטיים
                </button>
              </div>
              <div className="test-typing-container">
                <div className="typing-field">
                  <label>הקלד טקסט:</label>
                  <textarea
                    placeholder="התחל להקליד... חוקי ההמרה יופעלו אוטומטית בהתאם לקטגוריות"
                    value={transformTestInput}
                    onChange={e => {
                      const text = e.target.value;
                      setTransformTestInput(text);
                      
                      // Apply transformations in real-time
                      let transformed = text;
                      const appliedRules: string[] = [];
                      
                      // Sort transformations by priority (highest first)
                      const activeTransforms = transformations
                        .filter(t => t.is_active)
                        .sort((a, b) => b.priority - a.priority);
                      
                      // Function to escape regex special characters
                      const escapeRegex = (str: string) => {
                        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      };
                      
                      // Apply each transformation rule
                      activeTransforms.forEach(transform => {
                        // Apply transformations to ALL Hebrew prefixes for this category
                        const hebrewPrefixes = ['ו', 'ב', 'ל', 'מ', 'מה', 'כ', 'כש', 'ה', 'על', 'אל', 'את', 'של', 'עם', 'אחר', 'לפני', 'אחרי'];
                        
                        // Find all shortcuts that match this category
                        const categoryShortcuts = shortcuts.filter(s => 
                          s.category === transform.category_name
                        );
                        
                        categoryShortcuts.forEach(shortcut => {
                          // Check for ALL Hebrew prefix variations
                          hebrewPrefixes.forEach(prefix => {
                            const variationPattern = prefix + shortcut.shortcut;
                            
                            if (transformed.includes(variationPattern)) {
                              // Apply transformation using template
                              let transformedExpansion;
                              if (transform.transformation_template) {
                                // Use template for ALL prefixes
                                transformedExpansion = transform.transformation_template
                                  .replace('{prefix}', prefix)
                                  .replace('{expansion}', shortcut.expansion);
                              } else {
                                // Fallback defaults
                                if (transform.category_name === 'english') {
                                  transformedExpansion = prefix + '- ' + shortcut.expansion;
                                } else {
                                  transformedExpansion = prefix + shortcut.expansion;
                                }
                              }
                              
                              transformed = transformed.replace(
                                new RegExp(escapeRegex(variationPattern), 'g'), 
                                transformedExpansion
                              );
                              appliedRules.push(`${variationPattern} → ${transformedExpansion}`);
                            }
                          });
                        });
                        
                        // Apply suffix transformations
                        if (transform.suffix) {
                          // Find all shortcuts that match this category
                          const categoryShortcuts = shortcuts.filter(s => 
                            s.category === transform.category_name
                          );
                          
                          categoryShortcuts.forEach(shortcut => {
                            // Look for variations of this shortcut with the transformation suffix
                            const variationPattern = shortcut.shortcut + transform.suffix;
                            
                            if (transformed.includes(variationPattern)) {
                              // Replace the variation with the transformed expansion
                              const transformedExpansion = shortcut.expansion + ' ' + transform.suffix;
                              transformed = transformed.replace(
                                new RegExp(escapeRegex(variationPattern), 'g'), 
                                transformedExpansion
                              );
                              appliedRules.push(`${transform.category_name}: ${variationPattern} → ${transformedExpansion}`);
                            }
                          });
                        }
                      });
                      
                      setTransformTestResult(transformed);
                    }}
                    className="typing-input"
                    rows={3}
                  />
                </div>
                <div className="typing-field">
                  <label>תוצאה מעובדת:</label>
                  <div className="typing-output">
                    {transformTestResult || transformTestInput || '(הטקסט המעובד יופיע כאן)'}
                  </div>
                </div>
              </div>
              <div className="applied-rules">
                {transformTestInput && transformations.filter(t => t.is_active).length > 0 && (
                  <>
                    <strong>חוקים פעילים:</strong>
                    {transformations
                      .filter(t => t.is_active)
                      .sort((a, b) => b.priority - a.priority)
                      .map((t, i) => (
                        <span key={i} className="rule-tag">
                          {categories.find(c => c.name === t.category_name)?.label || t.category_name}:
                          {t.prefix && ` +${t.prefix}`}
                          {t.suffix && ` +${t.suffix}`}
                          {t.context_type !== 'any' && ` (${t.context_type})`}
                        </span>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="transformations-table">
            <table>
              <thead>
                <tr>
                  <th>קטגוריה</th>
                  <th>תחילית</th>
                  <th>סיומת</th>
                  <th>הקשר</th>
                  <th>עדיפות</th>
                  <th>דוגמה</th>
                  <th>פעיל</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {transformations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="no-results">
                      אין חוקי המרה. הוסף חוק חדש למעלה.
                    </td>
                  </tr>
                ) : (
                  transformations.map(trans => (
                    <tr key={trans.id}>
                      <td>
                        <span className="category-badge">
                          {categories.find(c => c.name === trans.category_name)?.label || trans.category_name}
                        </span>
                      </td>
                      <td>{trans.prefix || '-'}</td>
                      <td>{trans.suffix || '-'}</td>
                      <td>
                        {trans.context_type === 'space' ? 'רווח' :
                         trans.context_type === 'comma' ? 'פסיק' :
                         trans.context_type === 'period' ? 'נקודה' : 'הכל'}
                      </td>
                      <td>{trans.priority}</td>
                      <td>
                        {trans.example_before && trans.example_after ? (
                          <span className="example-text">
                            {trans.example_before} ← {trans.example_after}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={trans.is_active}
                          onChange={() => {
                            setTransformations(prev => prev.map(t => 
                              t.id === trans.id ? { ...t, is_active: !t.is_active } : t
                            ));
                          }}
                        />
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="edit-btn"
                          onClick={() => {
                            setEditingTransformation(trans);
                            setTransformationForm({
                              category_name: trans.category_name,
                              prefix: trans.prefix,
                              suffix: trans.suffix,
                              context_type: trans.context_type,
                              priority: trans.priority,
                              is_active: trans.is_active,
                              example_before: trans.example_before || '',
                              example_after: trans.example_after || ''
                            });
                          }}
                        >
                          ערוך
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={async () => {
                            if (confirm('למחוק חוק המרה זה?')) {
                              try {
                                const devUrl = window.location.hostname === 'localhost' 
                                  ? `${getApiUrl()}/dev/admin/advanced/transformations/${trans.id}`
                                  : `/dev/admin/advanced/transformations/${trans.id}`;
                                const response = await fetch(devUrl, {
                                  method: 'DELETE'
                                });
                                
                                if (response.ok) {
                                  setTransformations(prev => prev.filter(t => t.id !== trans.id));
                                }
                              } catch (error) {
                                console.error('Error deleting transformation:', error);
                                alert('שגיאה במחיקת חוק ההמרה');
                              }
                            }
                          }}
                        >
                          מחק
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Exceptions Tab */}
      {!loading && activeTab === 'exceptions' && (
        <>
          <div className="admin-controls">
            <div className="exception-form">
              <h3>{editingException ? 'עריכת חריג' : 'הוספת חריג לקיצור'}</h3>
              <div className="form-row">
                <select
                  value={exceptionForm.shortcut_id}
                  onChange={e => {
                    const selectedShortcut = shortcuts.find(s => s.id === e.target.value);
                    setExceptionForm(prev => ({ 
                      ...prev, 
                      shortcut_id: e.target.value,
                      shortcut_text: selectedShortcut?.shortcut || ''
                    }));
                  }}
                  className="form-input"
                >
                  <option value="">בחר קיצור</option>
                  {shortcuts.map(shortcut => (
                    <option key={shortcut.id} value={shortcut.id}>
                      {shortcut.shortcut} - {shortcut.expansion}
                    </option>
                  ))}
                </select>
                
                <select
                  value={exceptionForm.exception_type}
                  onChange={e => setExceptionForm(prev => ({ ...prev, exception_type: e.target.value as any }))}
                  className="form-input"
                >
                  <option value="no_transform">ללא המרה</option>
                  <option value="custom_transform">המרה מותאמת</option>
                  <option value="priority_override">שינוי עדיפות</option>
                </select>
                
                {exceptionForm.exception_type === 'custom_transform' && (
                  <input
                    type="text"
                    placeholder="המרה מותאמת"
                    value={exceptionForm.custom_transformation}
                    onChange={e => setExceptionForm(prev => ({ ...prev, custom_transformation: e.target.value }))}
                    className="form-input"
                  />
                )}
                
                {exceptionForm.exception_type === 'priority_override' && (
                  <input
                    type="number"
                    placeholder="עדיפות חדשה"
                    value={exceptionForm.override_priority}
                    onChange={e => setExceptionForm(prev => ({ ...prev, override_priority: parseInt(e.target.value) || 1 }))}
                    className="form-input priority-input"
                    min="1"
                    max="10"
                  />
                )}
                
                <input
                  type="text"
                  placeholder="הערות (אופציונלי)"
                  value={exceptionForm.notes}
                  onChange={e => setExceptionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-input"
                />
                
                <button
                  className="add-btn"
                  onClick={async () => {
                    try {
                      if (editingException) {
                        // Update existing exception
                        const response = await fetch(getDevApiUrl(`/dev/admin/advanced/exceptions/${editingException.id}`), {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(exceptionForm)
                        });
                        
                        if (response.ok) {
                          setExceptions(prev => prev.map(e => 
                            e.id === editingException.id ? { ...e, ...exceptionForm } : e
                          ));
                          setEditingException(null);
                        }
                      } else {
                        // Add new exception
                        const response = await fetch(getDevApiUrl('/dev/admin/advanced/exceptions'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(exceptionForm)
                        });
                        
                        if (response.ok) {
                          const newException = await response.json();
                          setExceptions(prev => [...prev, newException]);
                        }
                      }
                      
                      // Reset form
                      setExceptionForm({
                        shortcut_id: '',
                        shortcut_text: '',
                        exception_type: 'no_transform',
                        custom_transformation: '',
                        override_priority: 1,
                        notes: '',
                        is_active: true
                      });
                    } catch (error) {
                      console.error('Error saving exception:', error);
                      alert('שגיאה בשמירת החריג');
                    }
                  }}
                  disabled={!exceptionForm.shortcut_id}
                >
                  {editingException ? 'עדכן' : 'הוסף חריג'}
                </button>
                
                {editingException && (
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setEditingException(null);
                      setExceptionForm({
                        shortcut_id: '',
                        shortcut_text: '',
                        exception_type: 'no_transform',
                        custom_transformation: '',
                        override_priority: 1,
                        notes: '',
                        is_active: true
                      });
                    }}
                  >
                    ביטול
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="exceptions-table">
            <table>
              <thead>
                <tr>
                  <th>קיצור</th>
                  <th>סוג חריג</th>
                  <th>פרטים</th>
                  <th>הערות</th>
                  <th>פעיל</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-results">
                      אין חריגים. הוסף חריג חדש למעלה.
                    </td>
                  </tr>
                ) : (
                  exceptions.map(exc => {
                    const shortcut = shortcuts.find(s => s.id === exc.shortcut_id);
                    return (
                      <tr key={exc.id}>
                        <td>
                          <span className="shortcut-cell">
                            {exc.shortcut_text || shortcut?.shortcut || exc.shortcut_id}
                          </span>
                        </td>
                        <td>
                          {exc.exception_type === 'no_transform' ? 'ללא המרה' :
                           exc.exception_type === 'custom_transform' ? 'המרה מותאמת' :
                           'שינוי עדיפות'}
                        </td>
                        <td>
                          {exc.exception_type === 'custom_transform' ? exc.custom_transformation :
                           exc.exception_type === 'priority_override' ? `עדיפות: ${exc.override_priority}` :
                           '-'}
                        </td>
                        <td>{exc.notes || '-'}</td>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={exc.is_active}
                            onChange={() => {
                              setExceptions(prev => prev.map(e => 
                                e.id === exc.id ? { ...e, is_active: !e.is_active } : e
                              ));
                            }}
                          />
                        </td>
                        <td className="actions-cell">
                          <button 
                            className="edit-btn"
                            onClick={() => {
                              setEditingException(exc);
                              setExceptionForm({
                                shortcut_id: exc.shortcut_id,
                                shortcut_text: exc.shortcut_text || '',
                                exception_type: exc.exception_type,
                                custom_transformation: exc.custom_transformation || '',
                                override_priority: exc.override_priority || 1,
                                notes: exc.notes || '',
                                is_active: exc.is_active
                              });
                            }}
                          >
                            ערוך
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={async () => {
                              if (confirm('למחוק חריג זה?')) {
                                try {
                                  const response = await fetch(getDevApiUrl(`/dev/admin/advanced/exceptions/${exc.id}`), {
                                    method: 'DELETE'
                                  });
                                  
                                  if (response.ok) {
                                    setExceptions(prev => prev.filter(e => e.id !== exc.id));
                                  }
                                } catch (error) {
                                  console.error('Error deleting exception:', error);
                                  alert('שגיאה במחיקת החריג');
                                }
                              }
                            }}
                          >
                            מחק
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Shortcut Form Modal - Removed in favor of inline form */}
      {false && (
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