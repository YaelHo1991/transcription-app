'use client';

import React from 'react';

interface HeaderElement {
  id: string;
  type: 'fileName' | 'date' | 'pageNumber' | 'speakers' | 'duration' | 'text';
  value?: string;
  position: 'left' | 'center' | 'right';
  style: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: number;
    color?: string;
  };
}

interface HeaderDesignerProps {
  elements: HeaderElement[];
  onElementsChange: (elements: HeaderElement[]) => void;
}

export default function HeaderDesigner({ elements, onElementsChange }: HeaderDesignerProps) {
  const addElement = (type: HeaderElement['type']) => {
    const newElement: HeaderElement = {
      id: Date.now().toString(),
      type,
      value: type === 'text' ? 'טקסט חדש' : undefined,
      position: 'center',
      style: { size: 12 }
    };
    onElementsChange([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<HeaderElement>) => {
    onElementsChange(
      elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    );
  };

  const updateElementStyle = (id: string, styleUpdates: Partial<HeaderElement['style']>) => {
    onElementsChange(
      elements.map(el => 
        el.id === id 
          ? { ...el, style: { ...el.style, ...styleUpdates } }
          : el
      )
    );
  };

  const removeElement = (id: string) => {
    onElementsChange(elements.filter(el => el.id !== id));
  };

  const getElementLabel = (type: HeaderElement['type']) => {
    switch (type) {
      case 'fileName': return 'שם קובץ';
      case 'date': return 'תאריך';
      case 'pageNumber': return 'מספר עמוד';
      case 'speakers': return 'רשימת דוברים';
      case 'duration': return 'משך הקלטה';
      case 'text': return 'טקסט חופשי';
      default: return type;
    }
  };

  const getElementPreview = (element: HeaderElement) => {
    switch (element.type) {
      case 'fileName': return 'קובץ: test_recording.mp3';
      case 'date': return `תאריך: ${new Date().toLocaleDateString('he-IL')}`;
      case 'pageNumber': return 'עמוד 1';
      case 'speakers': return 'דוברים: יוסי כהן, שרה לוי';
      case 'duration': return 'משך: 00:45:30';
      case 'text': return element.value || 'טקסט';
      default: return '';
    }
  };

  return (
    <div className="header-designer">
      <div className="add-elements-section">
        <h3>הוסף רכיבים:</h3>
        <div className="element-buttons">
          <button onClick={() => addElement('fileName')} className="add-btn">
            + שם קובץ
          </button>
          <button onClick={() => addElement('date')} className="add-btn">
            + תאריך
          </button>
          <button onClick={() => addElement('pageNumber')} className="add-btn">
            + מספר עמוד
          </button>
          <button onClick={() => addElement('speakers')} className="add-btn">
            + דוברים
          </button>
          <button onClick={() => addElement('duration')} className="add-btn">
            + משך
          </button>
          <button onClick={() => addElement('text')} className="add-btn">
            + טקסט
          </button>
        </div>
      </div>

      <div className="elements-list">
        <h3>רכיבי הכותרת:</h3>
        {elements.length === 0 ? (
          <p className="no-elements">אין רכיבים - הוסף רכיבים מלמעלה</p>
        ) : (
          elements.map(element => (
            <div key={element.id} className="element-item">
              <div className="element-header">
                <span className="element-type">{getElementLabel(element.type)}</span>
                <button onClick={() => removeElement(element.id)} className="remove-btn">
                  ×
                </button>
              </div>
              
              <div className="element-preview">
                {getElementPreview(element)}
              </div>

              {element.type === 'text' && (
                <input
                  type="text"
                  value={element.value || ''}
                  onChange={(e) => updateElement(element.id, { value: e.target.value })}
                  placeholder="הכנס טקסט"
                  className="text-input"
                />
              )}

              <div className="element-controls">
                <div className="control-group">
                  <label>מיקום:</label>
                  <select 
                    value={element.position}
                    onChange={(e) => updateElement(element.id, { 
                      position: e.target.value as HeaderElement['position'] 
                    })}
                  >
                    <option value="left">שמאל</option>
                    <option value="center">מרכז</option>
                    <option value="right">ימין</option>
                  </select>
                </div>

                <div className="control-group">
                  <label>גודל:</label>
                  <input
                    type="number"
                    value={element.style.size || 12}
                    onChange={(e) => updateElementStyle(element.id, { 
                      size: parseInt(e.target.value) 
                    })}
                    min="8"
                    max="24"
                  />
                </div>

                <div className="style-buttons">
                  <button
                    className={`style-btn ${element.style.bold ? 'active' : ''}`}
                    onClick={() => updateElementStyle(element.id, { 
                      bold: !element.style.bold 
                    })}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    className={`style-btn ${element.style.italic ? 'active' : ''}`}
                    onClick={() => updateElementStyle(element.id, { 
                      italic: !element.style.italic 
                    })}
                  >
                    <em>I</em>
                  </button>
                  <button
                    className={`style-btn ${element.style.underline ? 'active' : ''}`}
                    onClick={() => updateElementStyle(element.id, { 
                      underline: !element.style.underline 
                    })}
                  >
                    <u>U</u>
                  </button>
                </div>

                <div className="control-group">
                  <label>צבע:</label>
                  <input
                    type="color"
                    value={`#${element.style.color || '000000'}`}
                    onChange={(e) => updateElementStyle(element.id, { 
                      color: e.target.value.substring(1) 
                    })}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}