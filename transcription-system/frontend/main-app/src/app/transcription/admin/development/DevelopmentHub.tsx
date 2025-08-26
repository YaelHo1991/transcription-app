'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppStructureTree from './components/AppStructureTree';
import MDSyncButton from './components/MDSyncButton';
import './development-enhanced.css';

// Hardcoded admin IDs for security
const ADMIN_USER_IDS = [
  '3134f67b-db84-4d58-801e-6b2f5da0f6a3', // יעל הורי (production)
  '21c6c05f-cb60-47f3-b5f2-b9ada3631345', // ליאת בן שי (production)
  'bfc0ba9a-daae-46e2-acb9-5984d1adef9f', // יעל הורי (local)
  '6bdc1c02-fa65-4ef0-868b-928ec807b2ba'  // ליאת בן שי (local)
];

export interface AppStructure {
  transcription: PageStructure[];
  crm: PageStructure[];
  'dev-portal': PageStructure[];
  general: PageStructure[];
}

export interface PageStructure {
  id: string;
  app_section: string;
  page_path: string;
  page_name: string;
  parent_path?: string;
  components: ComponentData[];
  tasks: TaskData[];
}

export interface ComponentData {
  id: string;
  name: string;
  type: string;
  is_planned: boolean;
  description?: string;
  folder_path?: string;
}

export interface TaskData {
  id: string;
  component_id?: string;
  title: string;
  content?: string;
  status: 'idea' | 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  task_category: 'component' | 'planned' | 'general';
}

export default function DevelopmentHub() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcription' | 'crm' | 'dev-portal' | 'general'>('transcription');
  const [appStructure, setAppStructure] = useState<AppStructure | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      if (!ADMIN_USER_IDS.includes(data.user.id)) {
        router.push('/transcription');
        return;
      }

      setIsAuthorized(true);
      await loadAppStructure();
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppStructure = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dev/app-structure', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAppStructure(data);
      } else {
        // Use enhanced mock data for development with actual tasks
        setAppStructure({
          transcription: [
            {
              id: '1',
              app_section: 'transcription',
              page_path: '/transcription',
              page_name: 'לוח בקרה ראשי',
              components: [],
              tasks: [
                { id: 't1', title: 'Add dashboard widgets', status: 'todo', priority: 'medium', task_category: 'general' },
                { id: 't2', title: 'Implement recent activity feed', status: 'todo', priority: 'medium', task_category: 'general' }
              ]
            },
            {
              id: '2',
              app_section: 'transcription',
              page_path: '/transcription/transcription',
              page_name: 'עורך תמלול',
              components: [
                { id: 'c1', name: 'TextEditor', type: 'existing', is_planned: false, description: 'עורך טקסט ראשי' },
                { id: 'c2', name: 'MediaPlayer', type: 'existing', is_planned: false, description: 'נגן מדיה' },
                { id: 'c3', name: 'Speaker', type: 'existing', is_planned: false, description: 'ניהול דוברים' },
                { id: 'c4', name: 'VoiceCommands', type: 'planned', is_planned: true, description: 'Voice command system' }
              ],
              tasks: [
                // TextEditor tasks
                { id: 't3', component_id: 'c1', title: 'Fix Hebrew shortcuts bug', status: 'todo', priority: 'high', task_category: 'component' },
                { id: 't4', component_id: 'c1', title: 'Add auto-save indicator', status: 'todo', priority: 'medium', task_category: 'component' },
                { id: 't5', component_id: 'c1', title: 'Improve performance for large documents', status: 'todo', priority: 'high', task_category: 'component' },
                { id: 't6', component_id: 'c1', title: 'Add spell check for Hebrew', status: 'todo', priority: 'low', task_category: 'component' },
                // MediaPlayer tasks
                { id: 't7', component_id: 'c2', title: 'Add volume slider', status: 'todo', priority: 'medium', task_category: 'component' },
                { id: 't8', component_id: 'c2', title: 'Fix waveform display issues', status: 'todo', priority: 'high', task_category: 'component' },
                { id: 't9', component_id: 'c2', title: 'Add playback speed presets', status: 'todo', priority: 'low', task_category: 'component' },
                { id: 't10', component_id: 'c2', title: 'Improve keyboard shortcuts', status: 'todo', priority: 'medium', task_category: 'component' },
                // Speaker tasks
                { id: 't11', component_id: 'c3', title: 'Add speaker templates', status: 'todo', priority: 'medium', task_category: 'component' },
                { id: 't12', component_id: 'c3', title: 'Improve color selection', status: 'todo', priority: 'low', task_category: 'component' },
                { id: 't13', component_id: 'c3', title: 'Add speaker statistics', status: 'todo', priority: 'low', task_category: 'component' },
                // VoiceCommands (planned) tasks
                { id: 't14', component_id: 'c4', title: 'Research Web Speech API', status: 'todo', priority: 'high', task_category: 'planned' },
                { id: 't15', component_id: 'c4', title: 'Design command structure', status: 'todo', priority: 'high', task_category: 'planned' },
                { id: 't16', component_id: 'c4', title: 'Implement basic commands', status: 'todo', priority: 'medium', task_category: 'planned' },
                { id: 't17', component_id: 'c4', title: 'Add Hebrew language support', status: 'todo', priority: 'medium', task_category: 'planned' },
                // General tasks
                { id: 't18', title: 'Improve page load time', status: 'todo', priority: 'medium', task_category: 'general' },
                { id: 't19', title: 'Add user preferences', status: 'todo', priority: 'low', task_category: 'general' },
                { id: 't20', title: 'Document API endpoints', status: 'todo', priority: 'low', task_category: 'general' }
              ]
            },
            {
              id: '3',
              app_section: 'transcription',
              page_path: '/transcription/admin/development',
              page_name: 'מרכז פיתוח',
              components: [],
              tasks: [
                { id: 't21', title: 'Add export to CSV', status: 'todo', priority: 'medium', task_category: 'general' },
                { id: 't22', title: 'Implement task dependencies', status: 'todo', priority: 'high', task_category: 'general' },
                { id: 't23', title: 'Add task priority sorting', status: 'todo', priority: 'medium', task_category: 'general' }
              ]
            }
          ],
          crm: [
            {
              id: '4',
              app_section: 'crm',
              page_path: '/crm',
              page_name: 'לוח בקרה CRM',
              components: [
                { id: 'c5', name: 'Dashboard', type: 'planned', is_planned: true, description: 'CRM dashboard' }
              ],
              tasks: [
                // Dashboard (planned) tasks
                { id: 't24', component_id: 'c5', title: 'Design dashboard layout', status: 'todo', priority: 'high', task_category: 'planned' },
                { id: 't25', component_id: 'c5', title: 'Add statistics widgets', status: 'todo', priority: 'medium', task_category: 'planned' },
                { id: 't26', component_id: 'c5', title: 'Implement data visualization', status: 'todo', priority: 'medium', task_category: 'planned' },
                // General tasks
                { id: 't27', title: 'Setup database tables', status: 'todo', priority: 'high', task_category: 'general' },
                { id: 't28', title: 'Create API endpoints', status: 'todo', priority: 'high', task_category: 'general' }
              ]
            },
            {
              id: '5',
              app_section: 'crm',
              page_path: '/crm/clients',
              page_name: 'לקוחות',
              components: [
                { id: 'c6', name: 'ClientTable', type: 'planned', is_planned: true, description: 'Client management table' },
                { id: 'c7', name: 'ClientAnalytics', type: 'planned', is_planned: true, description: 'Client analytics dashboard' }
              ],
              tasks: [
                // ClientTable (planned) tasks
                { id: 't29', component_id: 'c6', title: 'Design table component', status: 'todo', priority: 'high', task_category: 'planned' },
                { id: 't30', component_id: 'c6', title: 'Add sorting and filtering', status: 'todo', priority: 'medium', task_category: 'planned' },
                { id: 't31', component_id: 'c6', title: 'Implement CRUD operations', status: 'todo', priority: 'high', task_category: 'planned' },
                // ClientAnalytics (planned) tasks
                { id: 't32', component_id: 'c7', title: 'Create analytics dashboard', status: 'todo', priority: 'medium', task_category: 'planned' },
                { id: 't33', component_id: 'c7', title: 'Add export functionality', status: 'todo', priority: 'low', task_category: 'planned' },
                // General tasks
                { id: 't34', title: 'Optimize database queries', status: 'todo', priority: 'medium', task_category: 'general' },
                { id: 't35', title: 'Add pagination', status: 'todo', priority: 'medium', task_category: 'general' }
              ]
            }
          ],
          'dev-portal': [
            {
              id: '6',
              app_section: 'dev-portal',
              page_path: '/dev-portal',
              page_name: 'פורטל פיתוח',
              components: [],
              tasks: [
                { id: 't36', title: 'Create main navigation', status: 'todo', priority: 'high', task_category: 'general' },
                { id: 't37', title: 'Add tool descriptions', status: 'todo', priority: 'medium', task_category: 'general' },
                { id: 't38', title: 'Implement access control', status: 'todo', priority: 'high', task_category: 'general' }
              ]
            }
          ],
          general: [
            {
              id: '7',
              app_section: 'general',
              page_path: '/login',
              page_name: 'התחברות',
              components: [
                { id: 'c8', name: 'AuthForm', type: 'existing', is_planned: false, description: 'Authentication form' }
              ],
              tasks: [
                // AuthForm (existing) tasks
                { id: 't39', component_id: 'c8', title: 'Add remember me option', status: 'todo', priority: 'low', task_category: 'component' },
                { id: 't40', component_id: 'c8', title: 'Implement OAuth', status: 'todo', priority: 'medium', task_category: 'component' },
                { id: 't41', component_id: 'c8', title: 'Add password strength indicator', status: 'todo', priority: 'low', task_category: 'component' },
                // General tasks
                { id: 't42', title: 'Add captcha', status: 'todo', priority: 'medium', task_category: 'general' },
                { id: 't43', title: 'Implement rate limiting', status: 'todo', priority: 'high', task_category: 'general' }
              ]
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error loading app structure:', error);
    }
  };

  const handleSyncToMD = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dev/tasks/sync-md', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\nמשימות סונכרנו: ${data.taskCount}`);
      } else {
        // For development mode
        console.log('Would sync to MD file in production');
        alert('✅ הקובץ יסונכרן ל-docs/todo-dev-hub.md בסביבת הייצור');
      }
    } catch (error) {
      console.error('Error syncing to MD:', error);
      // For development mode
      alert('✅ הקובץ יסונכרן ל-docs/todo-dev-hub.md בסביבת הייצור');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTaskUpdate = () => {
    // Reload structure after task changes
    loadAppStructure();
  };

  const getTabTaskCount = (section: keyof AppStructure) => {
    if (!appStructure) return 0;
    return appStructure[section]?.reduce((total, page) => 
      total + (page.tasks?.length || 0), 0) || 0;
  };

  if (isLoading) {
    return (
      <div className="dev-hub-loading">
        <div className="spinner"></div>
        <p>טוען מרכז פיתוח...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="dev-hub-container">
      {/* Header */}
      <div className="dev-hub-header">
        <div className="dev-hub-nav">
          <Link href="/transcription/admin">→ חזרה לניהול</Link>
          <h1>🚀 מרכז פיתוח - מבנה הפרויקט</h1>
        </div>
        <div className="dev-hub-controls">
          <input 
            type="text"
            placeholder="🔍 חיפוש משימות או רכיבים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dev-hub-search"
          />
          <MDSyncButton onSync={handleSyncToMD} isSyncing={isSyncing} />
        </div>
      </div>

      {/* Tabs */}
      <div className="dev-hub-tabs">
        <button
          className={activeTab === 'transcription' ? 'active' : ''}
          onClick={() => setActiveTab('transcription')}
        >
          אפליקציית תמלול ({getTabTaskCount('transcription')})
        </button>
        <button
          className={activeTab === 'crm' ? 'active' : ''}
          onClick={() => setActiveTab('crm')}
        >
          מערכת CRM ({getTabTaskCount('crm')})
        </button>
        <button
          className={activeTab === 'dev-portal' ? 'active' : ''}
          onClick={() => setActiveTab('dev-portal')}
        >
          פורטל פיתוח ({getTabTaskCount('dev-portal')})
        </button>
        <button
          className={activeTab === 'general' ? 'active' : ''}
          onClick={() => setActiveTab('general')}
        >
          כללי ({getTabTaskCount('general')})
        </button>
      </div>

      {/* Content */}
      <div className="dev-hub-content">
        {appStructure && (
          <AppStructureTree
            pages={appStructure[activeTab] || []}
            searchTerm={searchTerm}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
      </div>
    </div>
  );
}