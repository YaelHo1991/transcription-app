'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function HomePage() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100" dir="rtl">
      <div className="container mx-auto px-4 py-16">
        {/* Header with auth status */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-right">
            <h1 className="text-5xl font-bold text-gray-800">
              מערכת תמלול מקצועית
            </h1>
          </div>
          <div className="text-left">
            {isAuthenticated ? (
              <div className="bg-white rounded-lg p-4 shadow-md">
                <p className="text-sm text-gray-600 mb-2">מחובר כ:</p>
                <p className="font-bold text-gray-800">{user?.username}</p>
                <p className="text-xs text-gray-500 mb-2">הרשאות: {user?.permissions}</p>
                <button
                  onClick={logout}
                  className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
                >
                  התנתק
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                התחבר למערכת
              </Link>
            )}
          </div>
        </div>
        
        <p className="text-xl text-center text-gray-600 mb-12">
          בחרו את המערכת הרצויה
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* License Sales Card */}
          <Link href="/licenses" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow h-full">
              <div className="text-6xl text-center mb-4">🔑</div>
              <h2 className="text-2xl font-bold text-center mb-2 text-gray-800 group-hover:text-blue-600">
                מערכת רישיונות
              </h2>
              <p className="text-center text-gray-600">
                רכישה וניהול רישיונות למערכות השונות
              </p>
            </div>
          </Link>

          {/* CRM Card */}
          <Link href="/crm" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow h-full">
              <div className="text-6xl text-center mb-4">👥</div>
              <h2 className="text-2xl font-bold text-center mb-2 text-gray-800 group-hover:text-green-600">
                מערכת CRM
              </h2>
              <p className="text-center text-gray-600">
                ניהול לקוחות, עבודות ומתמללים
              </p>
            </div>
          </Link>

          {/* Transcription Card */}
          <Link href="/transcription" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow h-full">
              <div className="text-6xl text-center mb-4">📝</div>
              <h2 className="text-2xl font-bold text-center mb-2 text-gray-800 group-hover:text-purple-600">
                אפליקציית תמלול
              </h2>
              <p className="text-center text-gray-600">
                תמלול, עריכה, הגהה וייצוא
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center space-y-4">
          <p className="text-sm text-gray-500">
            כל המערכות פועלות על פורט 3004 | Backend על פורט 5000
          </p>
          
          {/* Development Tools Links */}
          <div className="text-center space-x-4">
            <Link 
              href="/dev-portal" 
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm px-4 py-2 rounded transition-all transform hover:scale-105 mx-2"
            >
              🎯 פורטל מפתחים
            </Link>
            <Link 
              href="/api-test" 
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded transition-colors mx-2"
            >
              🧪 בדיקת API
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}