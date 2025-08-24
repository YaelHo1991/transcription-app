'use client';

import React from 'react';

interface FooterElement {
  id: string;
  type: 'fileName' | 'date' | 'pageNumber' | 'pageNumberFull' | 'text' | 'userName' | 'time';
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

interface FooterDesignerProps {
  elements: FooterElement[];
  onElementsChange: (elements: FooterElement[]) => void;
}

export default function FooterDesigner({ elements, onElementsChange }: FooterDesignerProps) {
  const addElement = (type: FooterElement['type']) => {
    const newElement: FooterElement = {
      id: Date.now().toString(),
      type,
      value: type === 'text' ? 'טקסט חדש' : undefined,
      position: 'center',
      style: { size: 11 }
    };
    onElementsChange([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<FooterElement>) => {
    onElementsChange(
      elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    );
  };

  const updateElementStyle = (id: string, styleUpdates: Partial<FooterElement['style']>) => {
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

  const getElementLabel = (type: FooterElement['type']) => {
    switch (type) {
      case 'fileName': return 'שם קובץ';
      case 'date': return 'תאריך';
      case 'pageNumber': return 'מספר עמוד';
      case 'pageNumberFull': return 'עמוד X מתוך Y';
      case 'userName': return 'שם משתמש';
      case 'time': return 'שעה';
      case 'text': return 'טקסט חופשי';
      default: return type;
    }
  };

  const getElementPreview = (element: FooterElement) => {
    switch (element.type) {
      case 'fileName': return 'test_recording.mp3';
      case 'date': return new Date().toLocaleDateString('he-IL');
      case 'pageNumber': return 'עמוד 1';
      case 'pageNumberFull': return 'עמוד 1 מתוך 5';
      case 'userName': return 'משתמש מערכת';
      case 'time': return new Date().toLocaleTimeString('he-IL');
      case 'text': return element.value || 'טקסט';
      default: return '';
    }
  };

  return (
    <div className="footer-designer">
      <div className="add-elements-section">
        <h3>הוסף רכיבי כותרת תחתונה:</h3>
        <div className="element-buttons">
          <button onClick={() => addElement('pageNumber')} className="add-btn">
            + מספר עמוד
          </button>
          <button onClick={() => addElement('pageNumberFull')} className="add-btn">
            + עמוד X מתוך Y
          </button>
          <button onClick={() => addElement('date')} className="add-btn">
            + תאריך
          </button>
          <button onClick={() => addElement('time')} className="add-btn">
            + שעה
          </button>
          <button onClick={() => addElement('fileName')} className="add-btn">
            + שם קובץ
          </button>
          <button onClick={() => addElement('userName')} className="add-btn">
            + משתמש
          </button>
          <button onClick={() => addElement('text')} className="add-btn">
            + טקסט
          </button>
        </div>
      </div>

      <div className="elements-list">
        <h3>רכיבי כותרת תחתונה:</h3>
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
                      position: e.target.value as FooterElement['position'] 
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
                    value={element.style.size || 11}
                    onChange={(e) => updateElementStyle(element.id, { 
                      size: parseInt(e.target.value) 
                    })}
                    min="8"
                    max="24"
                  />
                </div>

                <div className="style-buttons">
                  <button
                    className={'style-btn ' + (element.style.bold ? 'active' : '')}
                    onClick={() => updateElementStyle(element.id, { 
                      bold: !element.style.bold 
                    })}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    className={'style-btn ' + (element.style.italic ? 'active' : '')}
                    onClick={() => updateElementStyle(element.id, { 
                      italic: !element.style.italic 
                    })}
                  >
                    <em>I</em>
                  </button>
                  <button
                    className={'style-btn ' + (element.style.underline ? 'active' : '')}
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
                    value={'#' + (element.style.color || '000000')}
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