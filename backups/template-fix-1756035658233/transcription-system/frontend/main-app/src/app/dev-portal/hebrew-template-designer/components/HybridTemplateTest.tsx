'use client';

import React, { useState, useRef } from 'react';
import { HybridTemplateProcessor } from '../utils/hybridTemplateProcessor';

interface SampleData {
  fileName: string;
  speakers: string[];
  duration: string;
  blocks: Array<{
    speaker: string;
    text: string;
  }>;
}

interface HybridTemplateTestProps {
  sampleData: SampleData;
}

export default function HybridTemplateTest({ sampleData }: HybridTemplateTestProps) {
  const [processor] = useState(() => new HybridTemplateProcessor());
  const [templateStatus, setTemplateStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setTemplateStatus('❌ נא להעלות קובץ Word (.docx) בלבד');
      return;
    }

    setTemplateStatus('📄 טוען תבנית...');
    
    const result = await processor.loadTemplate(file);
    
    if (result.success) {
      setTemplateStatus(`✓ תבנית נטענה: ${file.name}`);
    } else {
      setTemplateStatus(`❌ שגיאה: ${result.message}`);
    }
  };

  const handleProcessTemplate = async () => {
    setIsProcessing(true);
    setTemplateStatus('🔄 מעבד תבנית בשיטה היברידית...');

    try {
      const templateData = {
        fileName: sampleData.fileName,
        speakers: sampleData.speakers.join(', '),
        duration: sampleData.duration,
        date: new Date().toLocaleDateString('he-IL'),
        blocks: sampleData.blocks
      };

      const result = await processor.processTemplate(templateData);
      
      if (result.success) {
        setTemplateStatus(`✓ ${result.message}`);
      } else {
        setTemplateStatus(`❌ שגיאה: ${result.message}`);
      }
    } catch (error) {
      setTemplateStatus(`❌ שגיאה: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTemplate = () => {
    processor.clearTemplate();
    setTemplateStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="hybrid-template-test">
      <div className="hybrid-header">
        <h2>🚀 בדיקה היברידית: תבנית + RTL אוטומטי</h2>
        <p>העלה תבנית Word עם placeholders, הטקסט הראשי יוכנס עם RTL מושלם</p>
      </div>

      <div className="template-format-info">
        <h3>פורמט התבנית שלך:</h3>
        <div className="format-example">
          <pre dir="ltr">{`
קובץ: {fileName}
דוברים: {speakers}
תאריך: {date}
משך: {duration}

=====================================
{transcriptionContent}
=====================================
          `}</pre>
        </div>
        <p className="info-note">
          💡 השתמש ב-{`{transcriptionContent}`} במקום שבו אתה רוצה את התמלול.
          הטקסט יוכנס עם עיצוב RTL מושלם!
        </p>
      </div>

      <div className="upload-section">
        <div className="upload-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="upload-btn"
          >
            📁 בחר תבנית Word
          </button>
          
          {processor.getTemplateInfo().loaded && (
            <button onClick={clearTemplate} className="clear-btn">
              🗑️ נקה
            </button>
          )}
        </div>

        {templateStatus && (
          <div className={`status-message ${
            templateStatus.includes('✓') ? 'success' : 
            templateStatus.includes('❌') ? 'error' : 
            'info'
          }`}>
            {templateStatus}
          </div>
        )}
      </div>

      {processor.getTemplateInfo().loaded && (
        <div className="process-section">
          <button 
            onClick={handleProcessTemplate}
            disabled={isProcessing}
            className="process-btn hybrid"
          >
            {isProcessing ? '🔄 מעבד...' : '🎯 צור מסמך עם RTL מושלם'}
          </button>
        </div>
      )}

      <div className="hybrid-explanation">
        <h3>איך זה עובד:</h3>
        <ol>
          <li>התבנית שלך מעובדת עם כל ה-placeholders הרגילים</li>
          <li>במקום {`{transcriptionContent}`} מוכנס הטקסט עם RTL מושלם</li>
          <li>התוצאה: מסמך אחד עם העיצוב שלך + טקסט עברי מושלם</li>
        </ol>
      </div>

      <style jsx>{`
        .hybrid-template-test {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          color: white;
        }

        .hybrid-header {
          text-align: center;
          margin-bottom: 25px;
        }

        .hybrid-header h2 {
          margin: 0 0 10px 0;
          font-size: 28px;
        }

        .template-format-info {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .format-example {
          background: rgba(0, 0, 0, 0.3);
          padding: 15px;
          border-radius: 6px;
          margin: 10px 0;
        }

        .format-example pre {
          margin: 0;
          color: #f0f0f0;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }

        .info-note {
          background: rgba(255, 255, 255, 0.2);
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
        }

        .upload-section {
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .upload-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .upload-btn, .clear-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s;
        }

        .upload-btn {
          background: #667eea;
          color: white;
        }

        .upload-btn:hover {
          background: #5a67d8;
          transform: translateY(-2px);
        }

        .clear-btn {
          background: #f56565;
          color: white;
        }

        .clear-btn:hover {
          background: #e53e3e;
        }

        .status-message {
          padding: 12px;
          border-radius: 6px;
          margin-top: 10px;
          font-weight: bold;
        }

        .status-message.success {
          background: #48bb78;
          color: white;
        }

        .status-message.error {
          background: #f56565;
          color: white;
        }

        .status-message.info {
          background: #4299e1;
          color: white;
        }

        .process-section {
          margin-bottom: 20px;
        }

        .process-btn {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 8px;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }

        .process-btn.hybrid {
          background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .process-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }

        .process-btn:disabled {
          background: #718096;
          cursor: not-allowed;
        }

        .hybrid-explanation {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 20px;
        }

        .hybrid-explanation h3 {
          margin-top: 0;
        }

        .hybrid-explanation ol {
          margin: 10px 0;
          padding-right: 20px;
        }

        .hybrid-explanation li {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}