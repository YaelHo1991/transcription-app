// Service to fetch and manage recording permissions
export async function fetchRecordingPermissions(userId: string, token: string): Promise<void> {
  try {
    // Use the auth endpoint that doesn't require admin permissions
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/recording-permissions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('[RecordingPermissions] Fetched:', data);
      localStorage.setItem('recording_enabled', String(data.recording_enabled || false));
      localStorage.setItem('recording_pages', JSON.stringify(data.recording_pages || []));
    } else {
      console.error('[RecordingPermissions] Failed to fetch:', response.status);
      // Set defaults if fetch fails
      localStorage.setItem('recording_enabled', 'false');
      localStorage.setItem('recording_pages', '[]');
    }
  } catch (error) {
    console.error('[RecordingPermissions] Error fetching:', error);
    // Set defaults if fetch fails
    localStorage.setItem('recording_enabled', 'false');
    localStorage.setItem('recording_pages', '[]');
  }
}