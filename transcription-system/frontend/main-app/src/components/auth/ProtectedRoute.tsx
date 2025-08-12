'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Permission } from '@/types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: Permission
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">טוען...</h2>
          <p className="text-gray-600">אנא המתן בזמן בדיקת ההרשאות</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null // Will redirect via useEffect
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    const defaultFallback = (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              אין הרשאה לדף זה
            </h2>
            <p className="text-gray-600 mb-6">
              שלום {user?.username}, אין לך הרשאה לגשת לדף זה.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>ההרשאות שלך:</strong> {user?.permissions}
                <br />
                <strong>הרשאה נדרשת:</strong> {requiredPermission}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                חזרה לדף הבית
              </button>
              <button
                onClick={() => router.back()}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                חזרה לדף הקודם
              </button>
            </div>
          </div>
        </div>
      </div>
    )

    return fallback || defaultFallback
  }

  // User is authenticated and has required permissions
  return <>{children}</>
}

// Higher-order component version for easier usage
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: Permission
) {
  const AuthenticatedComponent = (props: P) => {
    return (
      <ProtectedRoute requiredPermission={requiredPermission}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  
  return AuthenticatedComponent
}