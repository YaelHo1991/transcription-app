import { AutoCorrectSettings } from '@/app/transcription/transcription/components/TextEditor/components/AutoCorrectModal';

class AutoCorrectService {
  private baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/api' 
    : 'http://localhost:5000/api';

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Network error');
    }

    return response.json();
  }

  /**
   * Get user's auto-correct settings from server
   */
  async getSettings(): Promise<AutoCorrectSettings> {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found, using default settings');
        const { DEFAULT_SETTINGS } = await import('@/app/transcription/transcription/components/TextEditor/components/AutoCorrectModal');
        return DEFAULT_SETTINGS;
      }

      const response = await this.request<{ success: boolean; settings: AutoCorrectSettings }>('/transcription/autocorrect-settings');
      return response.settings;
    } catch (error) {
      console.log('Failed to fetch auto-correct settings, using defaults:', error);
      // Return default settings if fetch fails
      const { DEFAULT_SETTINGS } = await import('@/app/transcription/transcription/components/TextEditor/components/AutoCorrectModal');
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save user's auto-correct settings to server
   */
  async saveSettings(settings: AutoCorrectSettings): Promise<void> {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token found, cannot save settings');
        return; // Silently fail if not authenticated
      }

      await this.request<{ success: boolean; message: string }>('/transcription/autocorrect-settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
    } catch (error) {
      console.error('Failed to save auto-correct settings:', error);
      throw error;
    }
  }
}

export const autoCorrectService = new AutoCorrectService();