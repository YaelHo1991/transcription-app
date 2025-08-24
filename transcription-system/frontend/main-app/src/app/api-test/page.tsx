'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function ApiTestPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()

  const testEndpoint = async (endpoint: string, requiresAuth: boolean = false) => {
    setLoading(true)
    
    try {
      const headers: any = {
        'Content-Type': 'application/json'
      }
      
      if (requiresAuth) {
        const token = localStorage.getItem('auth_token')
        if (token) {
          headers['Authorization'] = 'Bearer ' + token
        }
      }
      
      const response = await fetch(endpoint, { headers })
      const data = await response.json()
      
      setResults(prev => [...prev, {
        endpoint,
        status: response.status,
        success: response.ok,
        data,
        timestamp: new Date().toLocaleTimeString()
      }])
    } catch (error) {
      setResults(prev => [...prev, {
        endpoint,
        status: 'ERROR',
        success: false,
        data: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toLocaleTimeString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => setResults([])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🧪 בדיקת API</h1>
          <p className="text-gray-600">בדיקת חיבור בין Frontend ל-Backend</p>
          
          {isAuthenticated && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                מחובר כ-{user?.username} עם הרשאות: {user?.permissions}
              </p>
            </div>
          )}
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-4 text-blue-600">בדיקות בסיסיות</h3>
            <div className="space-y-2">
              <button
                onClick={() => testEndpoint('/api/health')}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded transition-colors"
              >
                API Health Check
              </button>
              
              <button
                onClick={() => testEndpoint('/api/licenses/types')}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded transition-colors"
              >
                License Types
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-4 text-purple-600">בדיקות מורכבות</h3>
            <div className="space-y-2">
              <button
                onClick={() => testEndpoint('/api/crm/dashboard')}
                disabled={loading}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white py-2 px-4 rounded transition-colors"
              >
                CRM Dashboard
              </button>
              
              <button
                onClick={() => testEndpoint('/api/transcription/projects')}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-2 px-4 rounded transition-colors"
              >
                Transcription Projects
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-4 text-red-600">בדיקות אותנטיקציה</h3>
            <div className="space-y-2">
              <button
                onClick={() => testEndpoint('/api/auth/verify', true)}
                disabled={loading || !isAuthenticated}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-2 px-4 rounded transition-colors"
              >
                Verify Token
              </button>
              
              <button
                onClick={() => testEndpoint('/api/auth/me', true)}
                disabled={loading || !isAuthenticated}
                className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white py-2 px-4 rounded transition-colors"
              >
                Get User Info
              </button>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mb-6 text-center space-x-4">
          <button
            onClick={clearResults}
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded transition-colors"
          >
            נקה תוצאות
          </button>
          
          {loading && (
            <span className="text-blue-600 font-medium">⏳ בודק...</span>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">תוצאות הבדיקות</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={'p-4 rounded-lg border-r-4 ' + (
                    result.success 
                      ? 'bg-green-50 border-green-400' 
                      : 'bg-red-50 border-red-400'
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-gray-800">{result.endpoint}</span>
                      <span className={'mr-2 px-2 py-1 rounded text-sm font-medium ' + (
                        result.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      )}>
                        {result.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                  </div>
                  
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg transition-colors"
          >
            חזרה לדף הבית
          </a>
        </div>
      </div>
    </div>
  )
}