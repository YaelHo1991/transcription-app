'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const system = searchParams.get('system') || 'system';
  const message = searchParams.get('message') || 'אין לך הרשאות לגשת לדף זה';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          גישה נדחתה
        </h1>
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          אנא פנה למנהל המערכת להענקת הרשאות נוספות
        </p>
        <div className="space-y-4">
          <Link 
            href="/" 
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
          >
            חזור לדף הבית
          </Link>
          <Link 
            href="/login" 
            className="block w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
          >
            התחבר מחדש
          </Link>
          <Link 
            href="/licenses" 
            className="block w-full border border-blue-500 text-blue-500 hover:bg-blue-50 py-3 px-4 rounded-lg transition-colors font-medium"
          >
            רכוש רישיון
          </Link>
        </div>
        
        {system && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              מערכת: <span className="font-medium">{system}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <p>טוען...</p>
        </div>
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}