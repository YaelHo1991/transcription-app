// Authentication types for the transcription system

export interface User {
  id: string
  username: string
  email?: string
  permissions: string // ABCDEF format - each letter represents access to specific pages
  createdAt: Date
  lastLogin?: Date
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  message?: string
  error?: string
}

export interface AuthContextType {
  // User state
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  
  // Permission checking
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
}

// Permission definitions matching the ABCDEF system
export const PERMISSIONS = {
  // CRM System permissions
  CRM_CLIENTS: 'A',        // Client management
  CRM_JOBS: 'B',           // Job management  
  CRM_TRANSCRIBERS: 'C',   // Transcriber management
  
  // Transcription System permissions
  TRANSCRIPTION_WORK: 'D', // Transcription work
  PROOFREADING: 'E',       // Proofreading
  EXPORT_TOOLS: 'F',       // Export tools
} as const

// Helper type for permission values
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Route protection types
export interface RoutePermission {
  path: string
  requiredPermission?: Permission
  requiresAuth: boolean
}