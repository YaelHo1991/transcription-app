'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Paragraph, TextRun, AlignmentType, Packer, UnderlineType, Header, Footer, PageNumber, TabStopType, convertMillimetersToTwip, PageOrientation, ImageRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import HeaderDesigner from './HeaderDesigner';
import './advanced-template-designer.css';
import './header-designer.css';

// Element types
type ElementType = 'text' | 'fileName' | 'speakers' | 'duration' | 'pageNumber' | 'pageNumberFull' | 'userName' | 'logo' | 'date' | 'lineBreak' | 'tab';

interface TemplateElement {
  id: string;
  type: ElementType;
  value: string;
  position?: 'left' | 'center' | 'right';
  line?: 'above' | 'same' | 'below';
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

interface TemplateSection {
  elements: TemplateElement[];
  enabled: boolean;
}

export default function AdvancedTemplateDesigner() {
  const [templateName, setTemplateName] = useState('תבנית Word מתקדמת');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'header' | 'speakers' | 'content' | 'footer' | 'logo'>('header');
  
  // Template structure
  const [template, setTemplate] = useState({
    header: {
      enabled: true,
      elements: [
        { id: '1', type: 'text' as ElementType, value: 'קובץ', position: 'center' as const, bold: false, underline: true, size: 12, color: '000000' },
        { id: '2', type: 'text' as ElementType, value: ': ', position: 'center' as const, bold: false, underline: true, size: 12, color: '000000' },
        { id: '3', type: 'fileName' as ElementType, value: '{{fileName}}', position: 'center' as const, bold: false, underline: true, size: 12, color: '000000' }
      ],
      borderLine: {
        enabled: false,
        style: 'solid' as const,
        thickness: 1,
        color: '000000'
      }
    },
    
    body: {
      speakersLine: {
        enabled: true,
        elements: [
          { id: '4', type: 'text' as ElementType, value: 'דוברים', bold: true, underline: true, size: 14, color: '000000' },
          { id: '5', type: 'text' as ElementType, value: ': ', bold: true, underline: true, size: 14, color: '000000' },
          { id: '6', type: 'speakers' as ElementType, value: '{{speakers}}', bold: true, underline: true, size: 14, color: '000000' },
          { id: '7', type: 'text' as ElementType, value: ', ', bold: true, underline: true, size: 14, color: '000000' },
          { id: '8', type: 'text' as ElementType, value: 'משך ההקלטה', bold: true, underline: true, size: 14, color: '000000' },
          { id: '9', type: 'text' as ElementType, value: ': ', bold: true, underline: true, size: 14, color: '000000' },
          { id: '10', type: 'duration' as ElementType, value: '{{duration}}', bold: true, underline: true, size: 14, color: '000000' }
        ]
      },
      content: {
        alignment: 'justify' as const, // Default to justified for Hebrew
        tabPosition: 72,
        hangingIndent: 72,
        speakerBold: true,
        speakerColor: '000080',
        speakerSuffix: ':',
        fontSize: 12,
        fontFamily: 'David',
        lineSpacing: 1.5,
        spaceAfter: 6
      }
    },
    
    footer: {
      enabled: true,
      elements: [
        { id: '11', type: 'text' as ElementType, value: 'עמוד ', size: 11, color: '000000', alignment: 'center' as const },
        { id: '12', type: 'pageNumber' as ElementType, value: '{{pageNumber}}', size: 11, color: '000000', alignment: 'center' as const },
        { id: '13', type: 'text' as ElementType, value: ' מתוך ', size: 11, color: '000000', alignment: 'center' as const },
        { id: '14', type: 'pageNumber' as ElementType, value: '{{totalPages}}', size: 11, color: '000000', alignment: 'center' as const }
      ]
    } as TemplateSection,
    
    page: {
      orientation: 'portrait' as const,
      marginTop: 25.4,
      marginBottom: 25.4,
      marginLeft: 25.4,
      marginRight: 25.4
    }
  });

  // Available elements for toolbar
  const availableElements = [
    { type: 'text', label: 'טקסט חופשי', icon: '📝' },
    { type: 'fileName', label: 'שם קובץ', icon: '📄' },
    { type: 'speakers', label: 'רשימת דוברים', icon: '👥' },
    { type: 'duration', label: 'משך הקלטה', icon: '⏱️' },
    { type: 'pageNumber', label: 'מספר עמוד', icon: '📑' },
    { type: 'userName', label: 'שם משתמש', icon: '👤' },
    { type: 'logo', label: 'לוגו', icon: '🖼️' },
    { type: 'date', label: 'תאריך', icon: '📅' }
  ];

  const addElement = (type: ElementType) => {
    const newElement: TemplateElement = {
      id: Date.now().toString(),
      type,
      value: type === 'text' ? 'טקסט חדש' : '{{' + type + '}}',
      bold: false,
      underline: false,
      size: activeTab === 'header' ? 12 : activeTab === 'footer' ? 11 : 14,
      color: '000000',
      alignment: 'right'
    };

    if (activeTab === 'header') {
      setTemplate(prev => ({
        ...prev,
        header: {
          ...prev.header,
          elements: [...prev.header.elements, newElement]
        }
      }));
    } else if (activeTab === 'speakers') {
      setTemplate(prev => ({
        ...prev,
        body: {
          ...prev.body,
          speakersLine: {
            ...prev.body.speakersLine,
            elements: [...prev.body.speakersLine.elements, newElement]
          }
        }
      }));
    } else if (activeTab === 'footer') {
      setTemplate(prev => ({
        ...prev,
        footer: {
          ...prev.footer,
          elements: [...prev.footer.elements, newElement]
        }
      }));
    }
  };

  const updateElement = (section: 'header' | 'speakers' | 'footer', elementId: string, updates: Partial<TemplateElement>) => {
    if (section === 'header') {
      setTemplate(prev => ({
        ...prev,
        header: {
          ...prev.header,
          elements: prev.header.elements.map(el => 
            el.id === elementId ? { ...el, ...updates } : el
          )
        }
      }));
    } else if (section === 'speakers') {
      setTemplate(prev => ({
        ...prev,
        body: {
          ...prev.body,
          speakersLine: {
            ...prev.body.speakersLine,
            elements: prev.body.speakersLine.elements.map(el => 
              el.id === elementId ? { ...el, ...updates } : el
            )
          }
        }
      }));
    } else if (section === 'footer') {
      setTemplate(prev => ({
        ...prev,
        footer: {
          ...prev.footer,
          elements: prev.footer.elements.map(el => 
            el.id === elementId ? { ...el, ...updates } : el
          )
        }
      }));
    }
  };

  const deleteElement = (section: 'header' | 'speakers' | 'footer', elementId: string) => {
    if (section === 'header') {
      setTemplate(prev => ({
        ...prev,
        header: {
          ...prev.header,
          elements: prev.header.elements.filter(el => el.id !== elementId)
        }
      }));
    } else if (section === 'speakers') {
      setTemplate(prev => ({
        ...prev,
        body: {
          ...prev.body,
          speakersLine: {
            ...prev.body.speakersLine,
            elements: prev.body.speakersLine.elements.filter(el => el.id !== elementId)
          }
        }
      }));
    } else if (section === 'footer') {
      setTemplate(prev => ({
        ...prev,
        footer: {
          ...prev.footer,
          elements: prev.footer.elements.filter(el => el.id !== elementId)
        }
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoDataUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveTemplate = () => {
    const templateData = {
      ...template,
      logoDataUrl
    };
    localStorage.setItem('advancedWordTemplate', JSON.stringify(templateData));
    localStorage.setItem('advancedTemplateName', templateName);
    alert('התבנית נשמרה בהצלחה!');
  };

  const loadTemplate = () => {
    const saved = localStorage.getItem('advancedWordTemplate');
    const name = localStorage.getItem('advancedTemplateName');
    if (saved) {
      const data = JSON.parse(saved);
      setTemplate(data);
      if (data.logoDataUrl) setLogoDataUrl(data.logoDataUrl);
      if (name) setTemplateName(name);
      alert('התבנית נטענה בהצלחה!');
    }
  };

  const renderElementValue = (element: TemplateElement) => {
    switch (element.type) {
      case 'fileName': return 'דוגמה_הקלטה.mp3';
      case 'speakers': return 'יוסי כהן, רונית לוי';
      case 'duration': return '01:23:45';
      case 'pageNumber': return '1';
      case 'pageNumberFull': return 'עמוד 1 מתוך 5';
      case 'userName': return 'משתמש לדוגמה';
      case 'date': return new Date().toLocaleDateString('he-IL');
      case 'logo': return logoDataUrl ? '🖼️' : '[לוגו]';
      case 'lineBreak': return '';
      case 'tab': return '\t';
      default: return element.value;
    }
  };

  const generateTestDocument = async () => {
    try {
      const children: Paragraph[] = [];
      
      // Build speakers line
      if (template.body.speakersLine.enabled) {
        // Create a properly formatted Hebrew text
        const speakersText = template.body.speakersLine.elements.map(element => {
          switch (element.type) {
            case 'fileName': return 'דוגמה_הקלטה.mp3';
            case 'speakers': return 'יוסי כהן, רונית לוי';
            case 'duration': return '01:23:45';
            default: return element.value;
          }
        }).join('');
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: speakersText,
                bold: template.body.speakersLine.elements[0]?.bold,
                underline: template.body.speakersLine.elements[0]?.underline ? { type: UnderlineType.SINGLE } : undefined,
                size: (template.body.speakersLine.elements[0]?.size || 14) * 2,
                color: template.body.speakersLine.elements[0]?.color || '000000',
                font: 'David'
              })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 480 },
            bidirectional: true
          })
        );
      }
      
      // Sample content
      const examples = [
        { speaker: 'יוסי כהן', text: 'זו דוגמה לטקסט תמלול עם יישור לשני הצדדים והגדרות TAB.' },
        { speaker: 'רונית לוי', text: 'הטקסט מיושר לשני הצדדים (justify) כך שהוא נראה מסודר ומקצועי יותר, במיוחד בעברית.' }
      ];
      
      examples.forEach(item => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.speaker + template.body.content.speakerSuffix,
                bold: template.body.content.speakerBold,
                color: template.body.content.speakerColor,
                size: template.body.content.fontSize * 2,
                font: template.body.content.fontFamily
              }),
              new TextRun({
                text: '\t' + item.text,
                size: template.body.content.fontSize * 2,
                font: template.body.content.fontFamily
              })
            ],
            alignment: template.body.content.alignment === 'justify' ? AlignmentType.JUSTIFIED :
                      template.body.content.alignment === 'center' ? AlignmentType.CENTER :
                      template.body.content.alignment === 'left' ? AlignmentType.LEFT : AlignmentType.RIGHT,
            spacing: {
              after: template.body.content.spaceAfter * 20,
              line: template.body.content.lineSpacing * 240
            },
            indent: {
              left: template.body.content.tabPosition * 20,
              hanging: template.body.content.hangingIndent * 20
            },
            tabStops: [{
              type: TabStopType.LEFT,
              position: template.body.content.tabPosition * 20
            }],
            bidirectional: true
          })
        );
      });
      
      // Build headers - properly format Hebrew text
      const headers = template.header.enabled ? {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: template.header.elements.map(element => {
                    switch (element.type) {
                      case 'fileName': return 'דוגמה_הקלטה.mp3';
                      default: return element.value;
                    }
                  }).join(''),
                  bold: template.header.elements[0]?.bold,
                  underline: template.header.elements[0]?.underline ? { type: UnderlineType.SINGLE } : undefined,
                  size: (template.header.elements[0]?.size || 12) * 2,
                  color: template.header.elements[0]?.color || '000000',
                  font: 'David'
                })
              ],
              alignment: AlignmentType.CENTER,
              bidirectional: true
            })
          ]
        })
      } : undefined;
      
      // Build footers
      const footers = template.footer.enabled ? {
        default: new Footer({
          children: [
            new Paragraph({
              children: template.footer.elements.map(element => {
                if (element.value === '{{pageNumber}}') {
                  return new TextRun({
                    children: [PageNumber.CURRENT],
                    size: (element.size || 11) * 2
                  });
                } else if (element.value === '{{totalPages}}') {
                  return new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: (element.size || 11) * 2
                  });
                } else {
                  return new TextRun({
                    text: element.value,
                    size: (element.size || 11) * 2,
                    font: 'David'
                  });
                }
              }),
              alignment: AlignmentType.CENTER,
              bidirectional: true
            })
          ]
        })
      } : undefined;
      
      const doc = new Document({
        sections: [{
          headers,
          footers,
          properties: {
            page: {
              size: {
                orientation: template.page.orientation === 'landscape' ? 
                  PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
              },
              margin: {
                top: convertMillimetersToTwip(template.page.marginTop),
                bottom: convertMillimetersToTwip(template.page.marginBottom),
                left: convertMillimetersToTwip(template.page.marginLeft),
                right: convertMillimetersToTwip(template.page.marginRight)
              }
            },
            bidi: true
          },
          children
        }],
        styles: {
          default: {
            document: {
              run: {
                font: 'David',
                size: 24
              },
              paragraph: {
                bidirectional: true
              }
            }
          }
        }
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, templateName + '_test.docx');
      alert('המסמך נוצר בהצלחה!');
    } catch (error) {
      console.error('Error generating document:', error);
      alert('שגיאה ביצירת המסמך');
    }
  };

  const getCurrentSection = () => {
    switch (activeTab) {
      case 'header': return 'header';
      case 'speakers': return 'speakers';
      case 'footer': return 'footer';
      default: return null;
    }
  };

  const getCurrentElements = () => {
    switch (activeTab) {
      case 'header': return template.header.elements;
      case 'speakers': return template.body.speakersLine.elements;
      case 'footer': return template.footer.elements;
      default: return [];
    }
  };

  return (
    <div className="advanced-template-designer">
      {/* Header with tabs and actions */}
      <div className="designer-header">
        <div className="tabs-container">
          <button 
            className={'tab ' + (activeTab === 'header' ? 'active' : '')}
            onClick={() => setActiveTab('header')}
          >
            📑 כותרת עליונה
          </button>
          <button 
            className={'tab ' + (activeTab === 'speakers' ? 'active' : '')}
            onClick={() => setActiveTab('speakers')}
          >
            📝 שורת דוברים
          </button>
          <button 
            className={'tab ' + (activeTab === 'content' ? 'active' : '')}
            onClick={() => setActiveTab('content')}
          >
            💬 הגדרות תוכן
          </button>
          <button 
            className={'tab ' + (activeTab === 'footer' ? 'active' : '')}
            onClick={() => setActiveTab('footer')}
          >
            📄 כותרת תחתונה
          </button>
          <button 
            className={'tab ' + (activeTab === 'logo' ? 'active' : '')}
            onClick={() => setActiveTab('logo')}
          >
            🖼️ העלה לוגו
          </button>
        </div>
        
        <div className="header-actions">
          <input 
            type="text" 
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="template-name-input"
            placeholder="שם התבנית"
          />
          <button onClick={loadTemplate} className="btn-load">📂 טען</button>
          <button onClick={saveTemplate} className="btn-save">💾 שמור</button>
          <button onClick={generateTestDocument} className="btn-export">📄 בדיקה</button>
        </div>
      </div>

      {/* Element Toolbar - only for speakers and footer tabs */}
      {(activeTab === 'speakers' || activeTab === 'footer') && (
        <div className="element-toolbar">
          <h3>הוסף רכיבים:</h3>
          <div className="element-buttons">
            {availableElements.map(elem => (
              <button
                key={elem.type}
                className="element-btn"
                onClick={() => addElement(elem.type as ElementType)}
                title={elem.label}
              >
                <span className="element-icon">{elem.icon}</span>
                <span className="element-label">{elem.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="designer-layout">
        {/* Settings Panel */}
        <div className="settings-panel">
          
          {/* Header Tab Content */}
          {activeTab === 'header' && (
            <HeaderDesigner 
              settings={template.header}
              onUpdate={(headerSettings) => setTemplate(prev => ({
                ...prev,
                header: headerSettings
              }))}
            />
          )}

          {/* Speakers Tab Content */}
          {activeTab === 'speakers' && (
            <div className="section-card">
              <div className="section-header">
                <h3>שורת דוברים - עריכת רכיבים</h3>
                <label>
                  <input 
                    type="checkbox" 
                    checked={template.body.speakersLine.enabled}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      body: {
                        ...prev.body,
                        speakersLine: { ...prev.body.speakersLine, enabled: e.target.checked }
                      }
                    }))}
                  />
                  הפעל שורת דוברים
                </label>
              </div>
              
              <div className="elements-editor">
                {template.body.speakersLine.elements.map((element) => (
                  <div key={element.id} className="element-row">
                    <span className="element-type">
                      {element.type === 'text' ? '📝' : 
                       element.type === 'speakers' ? '👥' : 
                       element.type === 'duration' ? '⏱️' : '🔤'}
                    </span>
                    {element.type === 'text' ? (
                      <input 
                        type="text" 
                        value={element.value}
                        onChange={(e) => updateElement('speakers', element.id, { value: e.target.value })}
                        className="element-text-input"
                      />
                    ) : (
                      <span className="element-placeholder">{element.value}</span>
                    )}
                    <div className="element-style-controls">
                      <button 
                        className={'style-btn ' + (element.bold ? 'active' : '')}
                        onClick={() => updateElement('speakers', element.id, { bold: !element.bold })}
                      >
                        B
                      </button>
                      <button 
                        className={'style-btn ' + (element.underline ? 'active' : '')}
                        onClick={() => updateElement('speakers', element.id, { underline: !element.underline })}
                      >
                        U
                      </button>
                      <button 
                        className={'style-btn ' + (element.italic ? 'active' : '')}
                        onClick={() => updateElement('speakers', element.id, { italic: !element.italic })}
                      >
                        I
                      </button>
                      <input 
                        type="number" 
                        value={element.size || 14}
                        onChange={(e) => updateElement('speakers', element.id, { size: parseInt(e.target.value) })}
                        className="size-input"
                        min="8"
                        max="24"
                      />
                      <button 
                        className="delete-btn"
                        onClick={() => deleteElement('speakers', element.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="section-card">
              <div className="section-header">
                <h3>הגדרות תוכן מסמך</h3>
              </div>
              
              <div className="content-settings">
                <div className="control-group">
                  <label>יישור טקסט:</label>
                  <select 
                    value={template.body.content.alignment}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      body: {
                        ...prev.body,
                        content: { ...prev.body.content, alignment: e.target.value as any }
                      }
                    }))}
                  >
                    <option value="right">ימין</option>
                    <option value="left">שמאל</option>
                    <option value="center">מרכז</option>
                    <option value="justify">לשני הצדדים</option>
                  </select>
                </div>
                
                <div className="control-row">
                  <div className="control-group">
                    <label>מיקום TAB:</label>
                    <input 
                      type="number" 
                      value={template.body.content.tabPosition}
                      onChange={(e) => setTemplate(prev => ({
                        ...prev,
                        body: {
                          ...prev.body,
                          content: { ...prev.body.content, tabPosition: parseInt(e.target.value) }
                        }
                      }))}
                      min="36"
                      max="216"
                    />
                  </div>
                  
                  <div className="control-group">
                    <label>גודל גופן:</label>
                    <input 
                      type="number" 
                      value={template.body.content.fontSize}
                      onChange={(e) => setTemplate(prev => ({
                        ...prev,
                        body: {
                          ...prev.body,
                          content: { ...prev.body.content, fontSize: parseInt(e.target.value) }
                        }
                      }))}
                      min="8"
                      max="24"
                    />
                  </div>
                </div>
                
                <div className="control-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={template.body.content.speakerBold}
                      onChange={(e) => setTemplate(prev => ({
                        ...prev,
                        body: {
                          ...prev.body,
                          content: { ...prev.body.content, speakerBold: e.target.checked }
                        }
                      }))}
                    />
                    שם דובר מודגש
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer Tab */}
          {activeTab === 'footer' && (
            <div className="section-card">
              <div className="section-header">
                <h3>כותרת תחתונה - עריכת רכיבים</h3>
                <label>
                  <input 
                    type="checkbox" 
                    checked={template.footer.enabled}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      footer: { ...prev.footer, enabled: e.target.checked }
                    }))}
                  />
                  הפעל כותרת תחתונה
                </label>
              </div>
              
              <div className="elements-editor">
                {template.footer.elements.map((element) => (
                  <div key={element.id} className="element-row">
                    <span className="element-type">
                      {element.type === 'text' ? '📝' : 
                       element.type === 'pageNumber' ? '📑' : '🔤'}
                    </span>
                    {element.type === 'text' ? (
                      <input 
                        type="text" 
                        value={element.value}
                        onChange={(e) => updateElement('footer', element.id, { value: e.target.value })}
                        className="element-text-input"
                      />
                    ) : (
                      <span className="element-placeholder">{element.value}</span>
                    )}
                    <div className="element-style-controls">
                      <button 
                        className={'style-btn ' + (element.bold ? 'active' : '')}
                        onClick={() => updateElement('footer', element.id, { bold: !element.bold })}
                      >
                        B
                      </button>
                      <button 
                        className={'style-btn ' + (element.underline ? 'active' : '')}
                        onClick={() => updateElement('footer', element.id, { underline: !element.underline })}
                      >
                        U
                      </button>
                      <button 
                        className={'style-btn ' + (element.italic ? 'active' : '')}
                        onClick={() => updateElement('footer', element.id, { italic: !element.italic })}
                      >
                        I
                      </button>
                      <input 
                        type="number" 
                        value={element.size || 11}
                        onChange={(e) => updateElement('footer', element.id, { size: parseInt(e.target.value) })}
                        className="size-input"
                        min="8"
                        max="24"
                      />
                      <button 
                        className="delete-btn"
                        onClick={() => deleteElement('footer', element.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logo Tab */}
          {activeTab === 'logo' && (
            <div className="section-card">
              <div className="section-header">
                <h3>העלאת לוגו</h3>
              </div>
              <input 
                type="file" 
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button 
                onClick={() => logoInputRef.current?.click()}
                className="upload-btn"
              >
                {logoDataUrl ? 'החלף לוגו' : 'העלה לוגו'}
              </button>
              {logoDataUrl && (
                <img src={logoDataUrl} alt="Logo preview" className="logo-preview" />
              )}
            </div>
          )}

        </div>

        {/* Preview Panel */}
        <div className="preview-panel">
          <h3>תצוגה מקדימה</h3>
          <div className="page-preview">
            {/* Header */}
            {template.header.enabled && (
              <div className="preview-header">
                {/* Above line */}
                {template.header.elements.some(el => el.line === 'above') && (
                  <div className="preview-header-line">
                    <div className="preview-section left">
                      {template.header.elements.filter(el => el.position === 'left' && el.line === 'above').map(el => (
                        <span 
                          key={el.id}
                          style={{
                            fontWeight: el.bold ? 'bold' : 'normal',
                            textDecoration: el.underline ? 'underline' : 'none',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            fontSize: el.size + 'pt',
                            color: '#' + el.color
                          }}
                        >
                          {el.type === 'lineBreak' ? <br /> : 
                           el.type === 'tab' ? '\u00A0\u00A0\u00A0\u00A0' : 
                           renderElementValue(el)}
                        </span>
                      ))}
                    </div>
                    <div className="preview-section center">
                      {template.header.elements.filter(el => el.position === 'center' && el.line === 'above').map(el => (
                        <span 
                          key={el.id}
                          style={{
                            fontWeight: el.bold ? 'bold' : 'normal',
                            textDecoration: el.underline ? 'underline' : 'none',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            fontSize: el.size + 'pt',
                            color: '#' + el.color
                          }}
                        >
                          {el.type === 'lineBreak' ? <br /> : 
                           el.type === 'tab' ? '\u00A0\u00A0\u00A0\u00A0' : 
                           renderElementValue(el)}
                        </span>
                      ))}
                    </div>
                    <div className="preview-section right">
                      {template.header.elements.filter(el => el.position === 'right' && el.line === 'above').map(el => (
                        <span 
                          key={el.id}
                          style={{
                            fontWeight: el.bold ? 'bold' : 'normal',
                            textDecoration: el.underline ? 'underline' : 'none',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            fontSize: el.size + 'pt',
                            color: '#' + el.color
                          }}
                        >
                          {el.type === 'lineBreak' ? <br /> : 
                           el.type === 'tab' ? '\u00A0\u00A0\u00A0\u00A0' : 
                           renderElementValue(el)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Main header line */}
                <div className="preview-header-line">
                  <div className="preview-section left">
                    {template.header.elements.filter(el => el.position === 'left' && (!el.line || el.line === 'same')).map(el => (
                      <span 
                        key={el.id}
                        style={{
                          fontWeight: el.bold ? 'bold' : 'normal',
                          textDecoration: el.underline ? 'underline' : 'none',
                          fontStyle: el.italic ? 'italic' : 'normal',
                          fontSize: el.size + 'pt',
                          color: '#' + el.color
                        }}
                      >
                        {renderElementValue(el)}
                      </span>
                    ))}
                  </div>
                  
                  <div className="preview-section center">
                    {template.header.elements.filter(el => el.position === 'center' && (!el.line || el.line === 'same')).map(el => (
                      <span 
                        key={el.id}
                        style={{
                          fontWeight: el.bold ? 'bold' : 'normal',
                          textDecoration: el.underline ? 'underline' : 'none',
                          fontStyle: el.italic ? 'italic' : 'normal',
                          fontSize: el.size + 'pt',
                          color: '#' + el.color,
                          display: 'inline'
                        }}
                      >
                        {el.type === 'lineBreak' ? <br /> : 
                         el.type === 'tab' ? '\u00A0\u00A0\u00A0\u00A0' : 
                         renderElementValue(el)}
                      </span>
                    ))}
                  </div>
                  
                  <div className="preview-section right">
                    {template.header.elements.filter(el => el.position === 'right' && (!el.line || el.line === 'same')).map(el => (
                      <span 
                        key={el.id}
                        style={{
                          fontWeight: el.bold ? 'bold' : 'normal',
                          textDecoration: el.underline ? 'underline' : 'none',
                          fontStyle: el.italic ? 'italic' : 'normal',
                          fontSize: el.size + 'pt',
                          color: '#' + el.color
                        }}
                      >
                        {renderElementValue(el)}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Below line */}
                {template.header.elements.some(el => el.line === 'below') && (
                  <div className="preview-header-line">
                    <div className="preview-section left">
                      {template.header.elements.filter(el => el.position === 'left' && el.line === 'below').map(el => (
                        <span 
                          key={el.id}
                          style={{
                            fontWeight: el.bold ? 'bold' : 'normal',
                            textDecoration: el.underline ? 'underline' : 'none',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            fontSize: el.size + 'pt',
                            color: '#' + el.color
                          }}
                        >
                          {el.type === 'lineBreak' ? <br /> : 
                           el.type === 'tab' ? '\u00A0\u00A0\u00A0\u00A0' : 
                           renderElementValue(el)}
                        </span>
                      ))}
                    </div>
                    <div className="preview-section center">
                      {template.header.elements.filter(el => el.position === 'center' && el.line === 'below').map(el => (
                        <span 
                          key={el.id}
                          style={{
                            fontWeight: el.bold ? 'bold' : 'normal',
                            textDecoration: el.underline ? 'underline' : 'none',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            fontSize: el.size + 'pt',
                            color: '#' + el.color
                          }}
                        >
                          {el.type === 'lineBreak' ? <br /> : 
                           el.type === 'tab' ? '\u00A0\u00A0\u00A0\u00A0' : 
                           renderElementValue(el)}
                        </span>
                      ))}
                    </div>
                    <div className="preview-section right">
                      {template.header.elements.filter(el => el.position === 'right' && el.line === 'below').map(el => (
                        <span 
                          key={el.id}
                          style={{
                            fontWeight: el.bold ? 'bold' : 'normal',
                            textDecoration: el.underline ? 'underline' : 'none',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            fontSize: el.size + 'pt',
                            color: '#' + el.color
                          }}
                        >
                          {el.type === 'lineBreak' ? <br /> : 
                           el.type === 'tab' ? '\u00A0\u00A0\u00A0\u00A0' : 
                           renderElementValue(el)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Border line */}
                {template.header.borderLine.enabled && (
                  <div 
                    className="preview-border-line"
                    style={{
                      borderBottom: template.header.borderLine.thickness + 'px ${template.header.borderLine.style} #${template.header.borderLine.color}',
                      marginTop: '10px'
                    }}
                  />
                )}
              </div>
            )}
            
            {/* Body */}
            <div className="preview-body">
              {/* Speakers Line */}
              {template.body.speakersLine.enabled && (
                <div className="preview-speakers">
                  {template.body.speakersLine.elements.map(el => (
                    <span 
                      key={el.id}
                      style={{
                        fontWeight: el.bold ? 'bold' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        fontSize: el.size + 'pt',
                        color: '#' + el.color
                      }}
                    >
                      {renderElementValue(el)}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Content */}
              <div className="preview-content" style={{
                textAlign: template.body.content.alignment,
                fontSize: template.body.content.fontSize + 'pt',
                lineHeight: template.body.content.lineSpacing
              }}>
                <div style={{
                  paddingRight: template.body.content.tabPosition + 'px',
                  textIndent: '-' + template.body.content.tabPosition + 'px'
                }}>
                  <span style={{
                    fontWeight: template.body.content.speakerBold ? 'bold' : 'normal',
                    color: '#' + template.body.content.speakerColor
                  }}>
                    יוסי כהן{template.body.content.speakerSuffix}
                  </span>
                  <span style={{ marginRight: template.body.content.tabPosition - 50 + 'px' }}>
                    זו דוגמה לטקסט עם יישור לשני הצדדים והגדרות TAB מותאמות אישית.
                  </span>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            {template.footer.enabled && (
              <div className="preview-footer">
                {template.footer.elements.map(el => (
                  <span 
                    key={el.id}
                    style={{
                      fontWeight: el.bold ? 'bold' : 'normal',
                      textDecoration: el.underline ? 'underline' : 'none',
                      fontStyle: el.italic ? 'italic' : 'normal',
                      fontSize: el.size + 'pt',
                      color: '#' + el.color
                    }}
                  >
                    {renderElementValue(el)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}