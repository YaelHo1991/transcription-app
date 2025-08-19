'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { generateSimpleHtml } from './utils/simpleHtmlGenerator';
import './styles.css';

// Import components dynamically to avoid SSR issues
const HeaderDesigner = dynamic(() => import('./components/HeaderDesigner'), { 
  ssr: false,
  loading: () => <div>Loading header designer...</div>
});

const FooterDesigner = dynamic(() => import('./components/FooterDesigner'), { 
  ssr: false,
  loading: () => <div>Loading footer designer...</div>
});

const BodySettings = dynamic(() => import('./components/BodySettings'), { 
  ssr: false,
  loading: () => <div>Loading body settings...</div>
});

const HtmlPreview = dynamic(() => import('./components/HtmlPreview'), { 
  ssr: false,
  loading: () => <div>Loading preview...</div>
});

const ExportButton = dynamic(() => import('./components/ExportButton'), { 
  ssr: false,
  loading: () => <div>Loading export...</div>
});

const TemplateTestV2 = dynamic(() => import('./components/TemplateTestV2'), { 
  ssr: false,
  loading: () => <div>Loading template test V2...</div>
});

const HybridTemplateTest = dynamic(() => import('./components/HybridTemplateTest'), { 
  ssr: false,
  loading: () => <div>Loading hybrid template test...</div>
});

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

export default function HebrewTemplateDesigner() {
  const [headerElements, setHeaderElements] = useState<HeaderElement[]>([
    {
      id: '1',
      type: 'fileName',
      position: 'center',
      style: { bold: true, size: 14 }
    }
  ]);
  
  const [footerElements, setFooterElements] = useState<FooterElement[]>([
    {
      id: '1',
      type: 'pageNumberFull',
      position: 'center',
      style: { size: 11 }
    }
  ]);
  
  const [bodySettings, setBodySettings] = useState({
    alignment: 'justify' as 'right' | 'left' | 'center' | 'justify',
    lineNumbers: true,
    lineNumbersCountBy: 1,
    lineNumbersStartAt: 1
  });

  // Sample data for testing
  const sampleData = {
    fileName: 'test_recording.mp3',
    speakers: ['יוסי כהן', 'שרה לוי', 'דוד ישראלי'],
    duration: '00:45:30',
    blocks: [
      { speaker: 'יוסי כהן', text: 'שלום לכולם, זוהי פגישה חשובה מאוד.' },
      { speaker: 'שרה לוי', text: 'אכן, יש לנו הרבה נושאים לדון בהם היום.' },
      { speaker: 'דוד ישראלי', text: 'בואו נתחיל עם הנושא הראשון: התקציב השנתי.' },
      { speaker: 'יוסי כהן', text: 'מצוין. אני רוצה להציג את הנתונים של הרבעון האחרון.' },
      { speaker: 'שרה לוי', text: 'האם יש לנו את כל המסמכים המעודכנים?' },
    ]
  };

  const generateHtml = () => {
    return generateSimpleHtml(headerElements, sampleData, bodySettings);
  };

  return (
    <div className="hebrew-designer-container">
      <div className="designer-header">
        <h1>מעצב תבניות Word עם תמיכה בעברית</h1>
        <p>כלי פיתוח לבדיקת ייצוא Word עם עברית נכונה</p>
      </div>

      <div className="designer-layout">
        <div className="designer-left">
          <section className="designer-section">
            <h2>עיצוב כותרת עליונה (Header)</h2>
            <HeaderDesigner 
              elements={headerElements}
              onElementsChange={setHeaderElements}
            />
          </section>

          <section className="designer-section">
            <h2>עיצוב כותרת תחתונה (Footer)</h2>
            <FooterDesigner 
              elements={footerElements}
              onElementsChange={setFooterElements}
            />
          </section>

          <section className="designer-section">
            <h2>הגדרות גוף המסמך</h2>
            <BodySettings 
              settings={bodySettings}
              onSettingsChange={setBodySettings}
            />
          </section>

          <section className="designer-section">
            <h2>נתונים לדוגמה</h2>
            <div className="sample-data">
              <div className="data-item">
                <strong>קובץ:</strong> {sampleData.fileName}
              </div>
              <div className="data-item">
                <strong>דוברים:</strong> {sampleData.speakers.join(', ')}
              </div>
              <div className="data-item">
                <strong>משך:</strong> {sampleData.duration}
              </div>
              <div className="data-item">
                <strong>בלוקים:</strong> {sampleData.blocks.length} בלוקי טקסט
              </div>
            </div>
          </section>
        </div>

        <div className="designer-right">
          <section className="designer-section">
            <h2>תצוגה מקדימה של HTML</h2>
            <HtmlPreview html={generateHtml()} />
          </section>

          <section className="designer-section">
            <h2>ייצוא</h2>
            <ExportButton 
              html={generateHtml()}
              fileName="hebrew_test"
              headerElements={headerElements}
              footerElements={footerElements}
              bodySettings={bodySettings}
              sampleData={sampleData}
            />
            <div className="export-info">
              <p>לחץ על הכפתור לייצוא קובץ Word.</p>
              <p>בדוק את ה-Console לראות את תהליך הייצוא.</p>
            </div>
          </section>
        </div>
      </div>
      
      {/* V2 Template Testing Section */}
      <div className="v2-section">
        <TemplateTestV2 sampleData={sampleData} />
      </div>
      
      {/* Hybrid Template Testing Section */}
      <div className="hybrid-section">
        <HybridTemplateTest sampleData={sampleData} />
      </div>
    </div>
  );
}