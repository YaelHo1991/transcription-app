'use client';

import React from 'react';
import { UncertaintyRemark } from './types';

interface UncertaintyRemarkContentProps {
  remark: UncertaintyRemark;
  onNavigate?: (time: number) => void;
  onDelete?: (id: string) => void;
}

export default function UncertaintyRemarkContent({ 
  remark, 
  onNavigate, 
  onDelete 
}: UncertaintyRemarkContentProps) {
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          className="timestamp-link"
          onClick={() => onNavigate?.(remark.timestamp.time)}
          title="נווט למיקום במדיה"
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#059669',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {remark.timestamp.formatted}
        </button>
      </div>
      
      <span style={{ 
        fontSize: '13px', 
        color: '#1f2937',
        flex: 1 
      }}>
        {remark.originalText}
        {remark.confidence && (
          <span style={{
            marginLeft: '6px',
            color: '#f59e0b',
            fontWeight: 'bold',
            fontSize: '12px'
          }}>
            {remark.confidence}
          </span>
        )}
      </span>
      
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(remark.id);
          }}
          title="מחק"
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '11px',
            cursor: 'pointer',
            color: '#059669',
            minWidth: '35px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}