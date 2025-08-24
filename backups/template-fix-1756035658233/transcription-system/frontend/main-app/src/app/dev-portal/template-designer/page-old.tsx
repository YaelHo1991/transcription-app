'use client';

import React, { useState, useEffect, useRef } from 'react';
import './template-designer.css';
import { WordTemplateEngine, WordTemplate, TemplateSection, TemplateStyle } from './WordTemplateEngine';


export default function TemplateDesigner() {
  const editorRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WordTemplateEngine>(new WordTemplateEngine());
  const [activeSection, setActiveSection] = useState<string>('');
  const [templateName, setTemplateName] = useState('תבנית תמלול חדשה');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Template sections with default values
  const [sections, setSections] = useState<TemplateSection[]>([
    {
      id: 'title',
      type: 'title',
      content: 'שם הקובץ: {{fileName}}',
      style: {
        fontSize: 14,
        fontFamily: 'David',
        alignment: 'center',
        bold: false,
        underline: true,
        spaceAfter: 240
      }
    },
    {
      id: 'speakers',
      type: 'speakers',
      content: 'דוברים: {{speakers}}, זמן הקלטה: {{duration}}',
      style: {
        fontSize: 12,
        fontFamily: 'David',
        alignment: 'right',
        spaceAfter: 360
      }
    },
    {
      id: 'content',
      type: 'content',
      content: '{{speakerName}}:\t{{text}}',
      style: {
        fontSize: 12,
        fontFamily: 'David',
        alignment: 'justify',
        lineSpacing: 1.5,
        hangingIndent: 720,
        spaceAfter: 120
      }
    }
  ]);

  // Page settings
  const [pageSettings, setPageSettings] = useState({
    orientation: 'portrait' as 'portrait' | 'landscape',
    size: 'A4' as 'A4' | 'Letter' | 'Legal',
    margins: {
      top: 1134,
      bottom: 1134,
      left: 1134,
      right: 1134
    }
  });

  const updateSectionStyle = (sectionId: string, styleKey: string, value: any) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, style: { ...section.style, [styleKey]: value } }
        : section
    ));
  };

  const updateSectionContent = (sectionId: string, content: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, content }
        : section
    ));
  };

  const saveTemplate = () => {
    const template: WordTemplate = {
      name: templateName,
      sections,
      pageSettings
    };
    
    engineRef.current.saveTemplate(template);
    alert('התבנית נשמרה בהצלחה!');
  };

  const loadTemplate = () => {
    const template = engineRef.current.loadTemplate();
    if (template) {
      setTemplateName(template.name);
      setSections(template.sections);
      setPageSettings(template.pageSettings);
      alert('התבנית נטענה בהצלחה!');
    }
  };

  const exportToWord = async () => {
    const template: WordTemplate = {
      name: templateName,
      sections,
      pageSettings
    };
    
    // Test with sample data
    const sampleData = {
      fileName: 'דוגמה_להקלטה.mp3',
      speakers: ['יוסי כהן', 'רונית לוי'],
      duration: '01:23:45',
      blocks: [
        { speaker: 'יוסי כהן', text: 'שלום לכולם, אני שמח להיות כאן היום.' },
        { speaker: 'רונית לוי', text: 'אני מסכימה לחלוטין. זה נושא חשוב מאוד.' }
      ]
    };
    
    await engineRef.current.generateDocument(sampleData, template);
  };

  return (
    <div className="template-designer-container">
      {/* Header */}
      <div className="designer-header">
        <h1>🎨 מעצב תבניות Word</h1>
        <div className="header-actions">
          <button onClick={loadTemplate} className="btn-load">📂 טען תבנית</button>
          <button onClick={saveTemplate} className="btn-save">💾 שמור תבנית</button>
          <button onClick={exportToWord} className="btn-export">📄 ייצא לוורד</button>
        </div>
      </div>

      <div className="designer-content">
        {/* Sidebar - Controls */}
        <div className="designer-sidebar">
          <div className="sidebar-section">
            <h3>שם התבנית</h3>
            <input 
              type="text" 
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="template-name-input"
            />
          </div>

          <div className="sidebar-section">
            <h3>הגדרות עמוד</h3>
            <div className="control-group">
              <label>כיוון:</label>
              <select 
                value={pageSettings.orientation}
                onChange={(e) => setPageSettings({...pageSettings, orientation: e.target.value})}
              >
                <option value="portrait">לאורך</option>
                <option value="landscape">לרוחב</option>
              </select>
            </div>
            <div className="control-group">
              <label>גודל:</label>
              <select 
                value={pageSettings.size}
                onChange={(e) => setPageSettings({...pageSettings, size: e.target.value})}
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>מקטעי התבנית</h3>
            {sections.map(section => (
              <div 
                key={section.id}
                className={`section-control ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <h4>{section.type === 'title' ? 'כותרת המסמך' : section.type === 'speakers' ? 'שורת דוברים' : 'גוף הטקסט'}</h4>
                
                {activeSection === section.id && (
                  <div className="section-controls">
                    <div className="control-group">
                      <label>תוכן:</label>
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSectionContent(section.id, e.target.value)}
                        rows={3}
                      />
                      <small>משתנים: {{fileName}}, {{speakers}}, {{duration}}, {{speakerName}}, {{text}}</small>
                    </div>
                    
                    <div className="control-group">
                      <label>גופן:</label>
                      <select 
                        value={section.style?.fontFamily || 'David'}
                        onChange={(e) => updateSectionStyle(section.id, 'fontFamily', e.target.value)}
                      >
                        <option value="David">David</option>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Calibri">Calibri</option>
                      </select>
                    </div>
                    
                    <div className="control-group">
                      <label>גודל גופן:</label>
                      <select 
                        value={section.style?.fontSize || 12}
                        onChange={(e) => updateSectionStyle(section.id, 'fontSize', parseInt(e.target.value))}
                      >
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="16">16</option>
                        <option value="18">18</option>
                      </select>
                    </div>
                    
                    <div className="control-group">
                      <label>יישור:</label>
                      <select 
                        value={section.style?.alignment || 'right'}
                        onChange={(e) => updateSectionStyle(section.id, 'alignment', e.target.value)}
                      >
                        <option value="right">ימין</option>
                        <option value="left">שמאל</option>
                        <option value="center">מרכז</option>
                        <option value="justify">משני הצדדים</option>
                      </select>
                    </div>
                    
                    {section.type === 'content' && (
                      <>
                        <div className="control-group">
                          <label>רווח שורות:</label>
                          <select 
                            value={section.style?.lineSpacing || 1.5}
                            onChange={(e) => updateSectionStyle(section.id, 'lineSpacing', parseFloat(e.target.value))}
                          >
                            <option value="1">1.0</option>
                            <option value="1.15">1.15</option>
                            <option value="1.5">1.5</option>
                            <option value="2">2.0</option>
                          </select>
                        </div>
                        
                        <div className="control-group">
                          <label>הזחה תלויה:</label>
                          <input 
                            type="text" 
                            value={section.style?.hangingIndent || 0}
                            onChange={(e) => updateSectionStyle(section.id, 'hangingIndent', parseInt(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="designer-main">
          <div className="page-preview" style={{
            padding: `${pageSettings.margins.top / 20}px ${pageSettings.margins.right / 20}px ${pageSettings.margins.bottom / 20}px ${pageSettings.margins.left / 20}px`
          }}>
            <div className="page-content" ref={editorRef}>
              {/* Header */}
              <div 
                className="preview-section header-section"
                style={{
                  fontSize: `${sections[0].style?.fontSize || 14}pt`,
                  fontFamily: sections[0].style?.fontFamily || 'David',
                  textAlign: (sections[0].style?.alignment || 'center') as any,
                  fontWeight: sections[0].style?.bold ? 'bold' : 'normal',
                  textDecoration: sections[0].style?.underline ? 'underline' : 'none',
                  marginBottom: `${(sections[0].style?.spaceAfter || 240) / 20}px`
                }}
              >
                שם הקובץ: דוגמה_להקלטה.mp3
              </div>

              {/* Speakers */}
              <div 
                className="preview-section speakers-section"
                style={{
                  fontSize: `${sections[1].style?.fontSize || 12}pt`,
                  fontFamily: sections[1].style?.fontFamily || 'David',
                  textAlign: (sections[1].style?.alignment || 'right') as any,
                  marginBottom: `${(sections[1].style?.spaceAfter || 360) / 20}px`
                }}
              >
                דוברים: יוסי כהן, רונית לוי, זמן הקלטה: 01:23:45 דקות
              </div>

              {/* Content Examples */}
              <div className="preview-section content-section">
                {[
                  { speaker: 'יוסי כהן', text: 'שלום לכולם, אני שמח להיות כאן היום ולדבר על הנושא החשוב הזה. כפי שכולכם יודעים, המצב היום דורש מאיתנו לחשוב אחרת ולפעול בדרכים חדשות.' },
                  { speaker: 'רונית לוי', text: 'אני מסכימה לחלוטין. המציאות השתנתה והגיע הזמן שנתאים את עצמנו. יש לנו הזדמנות פז לעשות שינוי אמיתי.' },
                  { speaker: 'יוסי כהן', text: 'בדיוק. ולכן אני מציע שנתחיל בשלושה צעדים מרכזיים: ראשית, נגדיר מחדש את היעדים שלנו. שנית, נבנה תוכנית פעולה מפורטת. ושלישית, נוודא שיש לנו את כל המשאבים הדרושים.' }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="content-paragraph"
                    style={{
                      fontSize: `${sections[2].style?.fontSize || 12}pt`,
                      fontFamily: sections[2].style?.fontFamily || 'David',
                      textAlign: (sections[2].style?.alignment || 'justify') as any,
                      lineHeight: sections[2].style?.lineSpacing || 1.5,
                      paddingRight: `${(sections[2].style?.hangingIndent || 720) / 20}px`,
                      textIndent: `-${(sections[2].style?.hangingIndent || 720) / 20}px`,
                      marginBottom: '12pt'
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>{item.speaker}:</span>
                    <span style={{ marginRight: '1em' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}