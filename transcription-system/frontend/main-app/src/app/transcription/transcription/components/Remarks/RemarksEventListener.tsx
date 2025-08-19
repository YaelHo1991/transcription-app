'use client';

import { useEffect } from 'react';
import { useRemarks } from './RemarksContext';
import { RemarkType, RemarkStatus } from './types';

export default function RemarksEventListener() {
  const { addRemark } = useRemarks();

  useEffect(() => {
    const handleUncertaintyRemark = (event: CustomEvent) => {
      const { timestamp, time, text, confidence, blockId, context } = event.detail;
      
      // Add uncertainty remark with simplified content and confidence level
      addRemark({
        type: RemarkType.UNCERTAINTY,
        content: text,
        status: RemarkStatus.OPEN,
        timestamp: { 
          time, 
          formatted: timestamp,
          context: context || 'טקסט סביב ההערה'
        },
        confidence: confidence || '',
        originalText: text
      } as any);
      
      console.log('Created uncertainty remark:', text, timestamp, 'confidence:', confidence, 'context:', context);
    };

    // Listen for uncertainty remark events
    document.addEventListener('createUncertaintyRemark', handleUncertaintyRemark as EventListener);

    return () => {
      document.removeEventListener('createUncertaintyRemark', handleUncertaintyRemark as EventListener);
    };
  }, [addRemark]);

  return null; // This component doesn't render anything
}