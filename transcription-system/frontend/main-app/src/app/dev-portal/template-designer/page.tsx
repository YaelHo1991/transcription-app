'use client';

import dynamic from 'next/dynamic';

// Import the advanced template designer without SSR (client-side only)
const AdvancedTemplateDesigner = dynamic(
  () => import('./AdvancedTemplateDesigner'),
  { 
    ssr: false,
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>טוען מעצב תבניות...</div>
  }
);

export default function TemplateDesignerPage() {
  return <AdvancedTemplateDesigner />;
}