import React from 'react';

interface HeaderElement {
  id: string;
  type: 'text' | 'fileName' | 'speakers' | 'duration' | 'pageNumber' | 'pageNumberFull' | 'userName' | 'date' | 'lineBreak' | 'tab';
  value: string;
  position: 'left' | 'center' | 'right';
  line?: 'above' | 'same' | 'below';
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
}

interface HeaderSettings {
  enabled: boolean;
  elements: HeaderElement[];
  borderLine: {
    enabled: boolean;
    style: 'solid' | 'dashed' | 'double';
    thickness: number;
    color: string;
  };
}

interface Props {
  settings: HeaderSettings;
  onUpdate: (settings: HeaderSettings) => void;
}

export default function HeaderDesigner({ settings, onUpdate }: Props) {
  const availableElements = [
    { type: 'text', label: 'טקסט חופשי', icon: '📝' },
    { type: 'fileName', label: 'שם קובץ', icon: '📄' },
    { type: 'speakers', label: 'רשימת דוברים', icon: '👥' },
    { type: 'duration', label: 'משך הקלטה', icon: '⏱️' },
    { type: 'pageNumber', label: 'מספר עמוד', icon: '📑' },
    { type: 'pageNumberFull', label: 'עמוד X מתוך Y', icon: '📑' },
    { type: 'userName', label: 'שם משתמש', icon: '👤' },
    { type: 'date', label: 'תאריך', icon: '📅' },
    { type: 'lineBreak', label: 'שורה חדשה', icon: '↵' },
    { type: 'tab', label: 'טאב', icon: '→' }
  ];

  const addElement = (type: string) => {
    const newElement: HeaderElement = {
      id: Date.now().toString(),
      type: type as any,
      value: type === 'text' ? 'טקסט חדש' : 
             type === 'pageNumber' ? '{{pageNumber}}' :
             type === 'pageNumberFull' ? '{{pageNumberFull}}' :
             type === 'lineBreak' ? '\n' :
             type === 'tab' ? '\t' :
             '{{' + type + '}}',
      position: 'center',
      line: 'same',
      bold: false,
      underline: false,
      size: 12,
      color: '000000'
    };

    onUpdate({
      ...settings,
      elements: [...settings.elements, newElement]
    });
  };

  const updateElement = (id: string, updates: Partial<HeaderElement>) => {
    onUpdate({
      ...settings,
      elements: settings.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    });
  };

  const deleteElement = (id: string) => {
    onUpdate({
      ...settings,
      elements: settings.elements.filter(el => el.id !== id)
    });
  };

  const moveElementUp = (index: number) => {
    if (index === 0) return;
    const newElements = [...settings.elements];
    [newElements[index - 1], newElements[index]] = [newElements[index], newElements[index - 1]];
    onUpdate({ ...settings, elements: newElements });
  };

  const moveElementDown = (index: number) => {
    if (index === settings.elements.length - 1) return;
    const newElements = [...settings.elements];
    [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
    onUpdate({ ...settings, elements: newElements });
  };

  const groupedElements = {
    above: {
      left: settings.elements.filter(el => el.position === 'left' && el.line === 'above'),
      center: settings.elements.filter(el => el.position === 'center' && el.line === 'above'),
      right: settings.elements.filter(el => el.position === 'right' && el.line === 'above')
    },
    same: {
      left: settings.elements.filter(el => el.position === 'left' && (!el.line || el.line === 'same')),
      center: settings.elements.filter(el => el.position === 'center' && (!el.line || el.line === 'same')),
      right: settings.elements.filter(el => el.position === 'right' && (!el.line || el.line === 'same'))
    },
    below: {
      left: settings.elements.filter(el => el.position === 'left' && el.line === 'below'),
      center: settings.elements.filter(el => el.position === 'center' && el.line === 'below'),
      right: settings.elements.filter(el => el.position === 'right' && el.line === 'below')
    }
  };

  return (
    <div className="header-designer-container">
      {/* Main Card with Sidebar Checkbox */}
      <div className="header-card">
        {/* Sidebar Toggle */}
        <div className="sidebar-toggle">
          <input 
            type="checkbox" 
            id="header-enable"
            checked={settings.enabled}
            onChange={(e) => onUpdate({ ...settings, enabled: e.target.checked })}
          />
          <label htmlFor="header-enable" className="sidebar-label">
            הפעל כותרת עליונה
          </label>
        </div>

        {/* Main Content */}
        <div className={'header-content ' + (!settings.enabled ? 'disabled' : '')}>
          {/* Border Line Settings */}
          <div className="settings-section">
            <div className="section-title">
              <input 
                type="checkbox" 
                id="border-enable"
                checked={settings.borderLine.enabled}
                onChange={(e) => onUpdate({
                  ...settings,
                  borderLine: { ...settings.borderLine, enabled: e.target.checked }
                })}
                disabled={!settings.enabled}
              />
              <label htmlFor="border-enable">קו הפרדה</label>
            </div>
            
            {settings.borderLine.enabled && settings.enabled && (
              <div className="border-settings">
                <select 
                  value={settings.borderLine.style}
                  onChange={(e) => onUpdate({
                    ...settings,
                    borderLine: { ...settings.borderLine, style: e.target.value as any }
                  })}
                >
                  <option value="solid">רציף</option>
                  <option value="dashed">מקווקו</option>
                  <option value="double">כפול</option>
                </select>
                
                <input 
                  type="number" 
                  value={settings.borderLine.thickness}
                  onChange={(e) => onUpdate({
                    ...settings,
                    borderLine: { ...settings.borderLine, thickness: parseInt(e.target.value) }
                  })}
                  min="1"
                  max="5"
                  className="thickness-input"
                />
              </div>
            )}
          </div>

          {/* Header Content Builder */}
          <div className="content-builder">
            <div className="builder-header">
              <div className="add-element-menu">
                <button className="add-menu-btn" disabled={!settings.enabled}>+ הוסף רכיב</button>
                <div className="add-dropdown">
                  {availableElements.map(elem => (
                    <button
                      key={elem.type}
                      className="dropdown-item"
                      onClick={() => addElement(elem.type)}
                    >
                      <span className="item-icon">{elem.icon}</span>
                      <span className="item-label">{elem.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <h4>תוכן הכותרת</h4>
            </div>
            
            {/* Elements List */}
            <div className="elements-list">
              {settings.elements.map((element, index) => (
                <div key={element.id} className="element-item">
                  {/* Element Display Line */}
                  <div className="element-display">
                    <span className="element-type-icon">
                      {element.type === 'text' ? '📝' :
                       element.type === 'fileName' ? '📄' :
                       element.type === 'speakers' ? '👥' :
                       element.type === 'duration' ? '⏱️' :
                       element.type === 'pageNumber' ? '📑' :
                       element.type === 'pageNumberFull' ? '📑' :
                       element.type === 'userName' ? '👤' :
                       element.type === 'date' ? '📅' :
                       element.type === 'lineBreak' ? '↵' : '→'}
                    </span>
                    
                    {element.type === 'text' ? (
                      <input 
                        type="text" 
                        value={element.value}
                        onChange={(e) => updateElement(element.id, { value: e.target.value })}
                        className="element-text-input"
                        disabled={!settings.enabled}
                      />
                    ) : (
                      <div className="element-info">
                        <span className="element-label">
                          {element.type === 'fileName' ? 'שם קובץ' :
                           element.type === 'speakers' ? 'רשימת דוברים' :
                           element.type === 'duration' ? 'משך הקלטה' :
                           element.type === 'pageNumber' ? 'מספר עמוד' :
                           element.type === 'pageNumberFull' ? 'עמוד X מתוך Y' :
                           element.type === 'userName' ? 'שם משתמש' :
                           element.type === 'date' ? 'תאריך' :
                           element.type === 'lineBreak' ? 'שורה חדשה' : 'טאב'}
                        </span>
                        <span className="element-tag">{element.value}</span>
                      </div>
                    )}
                    
                    {/* Delete button on the right */}
                    <button 
                      className="delete-btn"
                      onClick={() => deleteElement(element.id)}
                      disabled={!settings.enabled}
                      title="מחק"
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Element Controls Line */}
                  <div className="element-controls">
                    {/* Position and Line selectors */}
                    <div className="control-group">
                      <label>מיקום:</label>
                      <select
                        className="position-select"
                        value={element.position}
                        onChange={(e) => updateElement(element.id, { position: e.target.value as any })}
                        disabled={!settings.enabled}
                      >
                        <option value="left">שמאל</option>
                        <option value="center">מרכז</option>
                        <option value="right">ימין</option>
                      </select>
                      
                      <select
                        className="line-select"
                        value={element.line || 'same'}
                        onChange={(e) => updateElement(element.id, { line: e.target.value as any })}
                        disabled={!settings.enabled}
                      >
                        <option value="above">שורה עליונה</option>
                        <option value="same">שורה ראשית</option>
                        <option value="below">שורה תחתונה</option>
                      </select>
                    </div>
                    
                    {/* Style buttons */}
                    <div className="style-group">
                      <button 
                        className={'style-btn ' + (element.bold ? 'active' : '')}
                        onClick={() => updateElement(element.id, { bold: !element.bold })}
                        disabled={!settings.enabled}
                        title="מודגש"
                      >
                        B
                      </button>
                      <button 
                        className={'style-btn ' + (element.underline ? 'active' : '')}
                        onClick={() => updateElement(element.id, { underline: !element.underline })}
                        disabled={!settings.enabled}
                        title="קו תחתון"
                      >
                        U
                      </button>
                      <button 
                        className={'style-btn ' + (element.italic ? 'active' : '')}
                        onClick={() => updateElement(element.id, { italic: !element.italic })}
                        disabled={!settings.enabled}
                        title="נטוי"
                      >
                        I
                      </button>
                    </div>
                    
                    {/* Order buttons */}
                    <div className="order-group">
                      <button 
                        className="order-btn"
                        onClick={() => moveElementUp(index)}
                        disabled={!settings.enabled || index === 0}
                        title="הזז למעלה"
                      >
                        ↑
                      </button>
                      <button 
                        className="order-btn"
                        onClick={() => moveElementDown(index)}
                        disabled={!settings.enabled || index === settings.elements.length - 1}
                        title="הזז למטה"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="save-section">
            <button 
              className="save-btn"
              onClick={() => onUpdate(settings)}
              disabled={!settings.enabled}
            >
              💾 שמור והצג בתצוגה הראשית
            </button>
          </div>

          {/* Preview */}
          <div className="header-preview-section">
            <h4>תצוגה מקדימה</h4>
            <div className="preview-container">
              {/* Above line */}
              {(groupedElements.above.left.length > 0 || groupedElements.above.center.length > 0 || groupedElements.above.right.length > 0) && (
                <div className="preview-header-line">
                  <div className="preview-section left">
                    {groupedElements.above.left.map(el => (
                      <span key={el.id} style={{
                        fontWeight: el.bold ? 'bold' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        fontSize: el.size + 'pt'
                      }}>
                        {el.type === 'fileName' ? 'דוגמה.docx' : 
                         el.type === 'speakers' ? 'יוסי, רונית' :
                         el.type === 'duration' ? '01:23:45' :
                         el.type === 'pageNumber' ? '1' :
                         el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                         el.type === 'userName' ? 'משתמש' :
                         el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                         el.type === 'lineBreak' ? '' :
                         el.type === 'tab' ? '\t' :
                         el.value}
                      </span>
                    ))}
                  </div>
                  
                  <div className="preview-section center">
                    {groupedElements.above.center.map(el => (
                      <span key={el.id} style={{
                        fontWeight: el.bold ? 'bold' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        fontSize: el.size + 'pt'
                      }}>
                        {el.type === 'fileName' ? 'דוגמה.docx' : 
                         el.type === 'speakers' ? 'יוסי, רונית' :
                         el.type === 'duration' ? '01:23:45' :
                         el.type === 'pageNumber' ? '1' :
                         el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                         el.type === 'userName' ? 'משתמש' :
                         el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                         el.type === 'lineBreak' ? '' :
                         el.type === 'tab' ? '\t' :
                         el.value}
                      </span>
                    ))}
                  </div>
                  
                  <div className="preview-section right">
                    {groupedElements.above.right.map(el => (
                      <span key={el.id} style={{
                        fontWeight: el.bold ? 'bold' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        fontSize: el.size + 'pt'
                      }}>
                        {el.type === 'fileName' ? 'דוגמה.docx' : 
                         el.type === 'speakers' ? 'יוסי, רונית' :
                         el.type === 'duration' ? '01:23:45' :
                         el.type === 'pageNumber' ? '1' :
                         el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                         el.type === 'userName' ? 'משתמש' :
                         el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                         el.type === 'lineBreak' ? '' :
                         el.type === 'tab' ? '\t' :
                         el.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Same line (main) */}
              <div className="preview-header-line">
                <div className="preview-section left">
                  {groupedElements.same.left.map(el => (
                    <span key={el.id} style={{
                      fontWeight: el.bold ? 'bold' : 'normal',
                      textDecoration: el.underline ? 'underline' : 'none',
                      fontStyle: el.italic ? 'italic' : 'normal',
                      fontSize: el.size + 'pt'
                    }}>
                      {el.type === 'fileName' ? 'דוגמה.docx' : 
                       el.type === 'speakers' ? 'יוסי, רונית' :
                       el.type === 'duration' ? '01:23:45' :
                       el.type === 'pageNumber' ? '1' :
                       el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                       el.type === 'userName' ? 'משתמש' :
                       el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                       el.type === 'lineBreak' ? '' :
                       el.type === 'tab' ? '\t' :
                       el.value}
                    </span>
                  ))}
                </div>
                
                <div className="preview-section center">
                  {groupedElements.same.center.map(el => (
                    <span key={el.id} style={{
                      fontWeight: el.bold ? 'bold' : 'normal',
                      textDecoration: el.underline ? 'underline' : 'none',
                      fontStyle: el.italic ? 'italic' : 'normal',
                      fontSize: el.size + 'pt'
                    }}>
                      {el.type === 'fileName' ? 'דוגמה.docx' : 
                       el.type === 'speakers' ? 'יוסי, רונית' :
                       el.type === 'duration' ? '01:23:45' :
                       el.type === 'pageNumber' ? '1' :
                       el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                       el.type === 'userName' ? 'משתמש' :
                       el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                       el.type === 'lineBreak' ? '' :
                       el.type === 'tab' ? '\t' :
                       el.value}
                    </span>
                  ))}
                </div>
                
                <div className="preview-section right">
                  {groupedElements.same.right.map(el => (
                    <span key={el.id} style={{
                      fontWeight: el.bold ? 'bold' : 'normal',
                      textDecoration: el.underline ? 'underline' : 'none',
                      fontStyle: el.italic ? 'italic' : 'normal',
                      fontSize: el.size + 'pt'
                    }}>
                      {el.type === 'fileName' ? 'דוגמה.docx' : 
                       el.type === 'speakers' ? 'יוסי, רונית' :
                       el.type === 'duration' ? '01:23:45' :
                       el.type === 'pageNumber' ? '1' :
                       el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                       el.type === 'userName' ? 'משתמש' :
                       el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                       el.type === 'lineBreak' ? '' :
                       el.type === 'tab' ? '\t' :
                       el.value}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Below line */}
              {(groupedElements.below.left.length > 0 || groupedElements.below.center.length > 0 || groupedElements.below.right.length > 0) && (
                <div className="preview-header-line">
                  <div className="preview-section left">
                    {groupedElements.below.left.map(el => (
                      <span key={el.id} style={{
                        fontWeight: el.bold ? 'bold' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        fontSize: el.size + 'pt'
                      }}>
                        {el.type === 'fileName' ? 'דוגמה.docx' : 
                         el.type === 'speakers' ? 'יוסי, רונית' :
                         el.type === 'duration' ? '01:23:45' :
                         el.type === 'pageNumber' ? '1' :
                         el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                         el.type === 'userName' ? 'משתמש' :
                         el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                         el.type === 'lineBreak' ? '' :
                         el.type === 'tab' ? '\t' :
                         el.value}
                      </span>
                    ))}
                  </div>
                  
                  <div className="preview-section center">
                    {groupedElements.below.center.map(el => (
                      <span key={el.id} style={{
                        fontWeight: el.bold ? 'bold' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        fontSize: el.size + 'pt'
                      }}>
                        {el.type === 'fileName' ? 'דוגמה.docx' : 
                         el.type === 'speakers' ? 'יוסי, רונית' :
                         el.type === 'duration' ? '01:23:45' :
                         el.type === 'pageNumber' ? '1' :
                         el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                         el.type === 'userName' ? 'משתמש' :
                         el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                         el.type === 'lineBreak' ? '' :
                         el.type === 'tab' ? '\t' :
                         el.value}
                      </span>
                    ))}
                  </div>
                  
                  <div className="preview-section right">
                    {groupedElements.below.right.map(el => (
                      <span key={el.id} style={{
                        fontWeight: el.bold ? 'bold' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        fontSize: el.size + 'pt'
                      }}>
                        {el.type === 'fileName' ? 'דוגמה.docx' : 
                         el.type === 'speakers' ? 'יוסי, רונית' :
                         el.type === 'duration' ? '01:23:45' :
                         el.type === 'pageNumber' ? '1' :
                         el.type === 'pageNumberFull' ? 'עמוד 1 מתוך 5' :
                         el.type === 'userName' ? 'משתמש' :
                         el.type === 'date' ? new Date().toLocaleDateString('he-IL') :
                         el.type === 'lineBreak' ? '' :
                         el.type === 'tab' ? '\t' :
                         el.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Border line */}
              {settings.borderLine.enabled && (
                <div 
                  className="preview-border"
                  style={{
                    borderBottom: settings.borderLine.thickness + 'px ${settings.borderLine.style} #${settings.borderLine.color}'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}