// Mock data for development tools
// WARNING: This is ONLY for development. Never use in production!

export const mockUsers = process.env.NODE_ENV === 'development' ? [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // Dev only - passwords hidden in production
    plain_password: 'admin123',
    email: 'admin@example.com',
    full_name: 'מנהל מערכת',
    role: 'admin',
    permissions: 'ABCDEF',
    is_admin: true,
    transcriber_code: null,
    license: 'ADMIN-LICENSE',
    status: 'active',
    createdAt: new Date('2024-01-01')
  },
  {
    id: '2',
    username: 'user1',
    password: 'pass123',
    plain_password: 'pass123',
    email: 'user1@example.com',
    full_name: 'משתמש רגיל',
    role: 'user',
    permissions: 'A',
    is_admin: false,
    transcriber_code: null,
    license: 'BASIC-LICENSE-001',
    status: 'active',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '3',
    username: 'demo',
    password: 'demo123',
    plain_password: 'demo123',
    email: 'demo@example.com',
    full_name: 'משתמש הדגמה',
    role: 'demo',
    permissions: 'D',
    is_admin: false,
    transcriber_code: 'TR001',
    license: 'TRIAL-LICENSE-001',
    status: 'active',
    createdAt: new Date('2024-02-01')
  },
  {
    id: '4',
    username: 'transcriber1',
    password: 'trans123',
    plain_password: 'trans123',
    email: 'trans1@example.com',
    full_name: 'מתמלל ראשי',
    role: 'transcriber',
    permissions: 'DEF',
    is_admin: false,
    transcriber_code: 'TR002',
    license: 'TRANS-LICENSE-001',
    status: 'active',
    createdAt: new Date('2024-01-20')
  },
  {
    id: '5',
    username: 'crm_manager',
    password: 'crm123',
    plain_password: 'crm123',
    email: 'crm@example.com',
    full_name: 'מנהל CRM',
    role: 'crm_manager',
    permissions: 'ABC',
    is_admin: false,
    transcriber_code: null,
    license: 'CRM-LICENSE-001',
    status: 'active',
    createdAt: new Date('2024-01-10')
  }
] : []; // Empty array in production

export const mockLicenses = process.env.NODE_ENV === 'development' ? [
  {
    id: 1,
    code: 'ADMIN-LICENSE',
    type: 'admin',
    userId: 1,
    status: 'active',
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2025-12-31'),
    features: ['all']
  },
  {
    id: 2,
    code: 'BASIC-LICENSE-001',
    type: 'basic',
    userId: 2,
    status: 'active',
    validFrom: new Date('2024-01-15'),
    validUntil: new Date('2024-12-31'),
    features: ['transcription', 'export']
  },
  {
    id: 3,
    code: 'TRIAL-LICENSE-001',
    type: 'trial',
    userId: 3,
    status: 'inactive',
    validFrom: new Date('2024-02-01'),
    validUntil: new Date('2024-03-01'),
    features: ['transcription-limited']
  },
  {
    id: 4,
    code: 'TRANS-LICENSE-001',
    type: 'transcriber',
    userId: 4,
    status: 'active',
    validFrom: new Date('2024-01-20'),
    validUntil: new Date('2024-12-31'),
    features: ['transcription', 'proofreading', 'export']
  },
  {
    id: 5,
    code: 'CRM-LICENSE-001',
    type: 'crm',
    userId: 5,
    status: 'active',
    validFrom: new Date('2024-01-10'),
    validUntil: new Date('2024-12-31'),
    features: ['crm', 'clients', 'projects']
  }
] : []; // Empty array in production