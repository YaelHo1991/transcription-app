'use client';

import React, { useState } from 'react';
import { saveAs } from 'file-saver';

interface ExportButtonProps {
  html: string;
  fileName: string;
}

export default function ExportButton({ html, fileName, headerElements, footerElements, bodySettings, sampleData }: ExportButtonProps & { headerElements?: any; footerElements?: any; bodySettings?: any; sampleData?: any }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleExportWithRealHeader = async () => {
    if (!headerElements || !footerElements || !sampleData) {
      alert('Missing header/footer elements or sample data');
      return;
    }
    
    setIsExporting(true);
    setExportStatus('יוצר Word עם Header ו-Footer אמיתיים...');
    
    try {
      const { generateDocxWithRealHeader } = await import('../utils/docxGenerator');
      await generateDocxWithRealHeader(headerElements, footerElements, sampleData, bodySettings);
      setExportStatus('✓ קובץ Word נוצר עם Header ו-Footer אמיתיים!');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      setExportStatus(`❌ שגיאה: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('מתחיל ייצוא...');
    
    console.log('=== Starting Hebrew Word Export ===');
    console.log('HTML length:', html.length);
    console.log('First 500 chars of HTML:', html.substring(0, 500));
    
    try {
      // Dynamically import html-docx-js
      console.log('Loading html-docx-js library...');
      let htmlDocx;
      try {
        // @ts-ignore
        const module = await import('html-docx-js/dist/html-docx');
        htmlDocx = module.default || module;
        console.log('html-docx-js loaded successfully');
      } catch (importError) {
        console.error('Failed to import html-docx-js:', importError);
        throw new Error('Failed to load Word export library');
      }
      
      // Convert HTML to DOCX
      console.log('Converting HTML to DOCX...');
      const converted = htmlDocx.asBlob(html, {
        orientation: 'portrait',
        margins: {
          top: '1in',
          bottom: '1in',
          left: '1in',
          right: '1in'
        }
      });
      
      console.log('Conversion successful!');
      console.log('Blob size:', converted.size);
      console.log('Blob type:', converted.type);
      
      // Save the file
      const fullFileName = `${fileName}_${new Date().getTime()}.docx`;
      console.log('Saving as:', fullFileName);
      
      saveAs(converted, fullFileName);
      
      setExportStatus('✓ הייצוא הושלם בהצלחה!');
      console.log('=== Export Complete ===');
      
    } catch (error) {
      console.error('!!! Export Error !!!', error);
      setExportStatus(`❌ שגיאה: ${error}`);
      
      // Fallback to HTML export
      console.log('Falling back to HTML export...');
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const fullFileName = `${fileName}_${new Date().getTime()}.html`;
      saveAs(blob, fullFileName);
      setExportStatus('⚠️ נשמר כ-HTML - פתח ב-Word ושמור כ-DOCX');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHtml = () => {
    console.log('Exporting as HTML for testing...');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${fileName}_test.html`);
    setExportStatus('✓ קובץ HTML נשמר - פתח ב-Word לבדיקה');
  };

  return (
    <div className="export-button-container">
      <button 
        onClick={handleExportWithRealHeader}
        disabled={isExporting}
        className="export-btn primary"
        style={{ backgroundColor: '#2196F3' }}
      >
        {isExporting ? 'מייצא...' : '🎯 ייצא Word עם Header ו-Footer אמיתיים'}
      </button>
      
      <button 
        onClick={handleExport}
        disabled={isExporting}
        className="export-btn primary"
      >
        {isExporting ? 'מייצא...' : 'ייצא ל-Word (HTML)'}
      </button>
      
      <button 
        onClick={handleExportHtml}
        className="export-btn secondary"
      >
        ייצא כ-HTML (לבדיקה)
      </button>
      
      {exportStatus && (
        <div className={`export-status ${exportStatus.includes('✓') ? 'success' : exportStatus.includes('❌') ? 'error' : ''}`}>
          {exportStatus}
        </div>
      )}
      
      <div className="export-notes">
        <h4>הערות לבדיקה:</h4>
        <ul>
          <li>בדוק ש-"קובץ:" מופיע נכון (לא הפוך)</li>
          <li>בדוק שמספרי העמודים מיושרים נכון</li>
          <li>בדוק שאין קווים אדומים מתחת למילים</li>
          <li>פתח את ה-Console לראות לוגים</li>
        </ul>
      </div>
    </div>
  );
}