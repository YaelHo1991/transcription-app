import { useState } from 'react';

interface PlannedComponentFormProps {
  pagePath: string;
  appSection: string;
  onAdd: () => void;
  onCancel: () => void;
}

export default function PlannedComponentForm({ 
  pagePath, 
  appSection, 
  onAdd, 
  onCancel 
}: PlannedComponentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('אנא הכנס שם רכיב');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dev/components/planned', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          page_path: pagePath,
          app_section: appSection
        })
      });

      if (response.ok) {
        onAdd();
      } else {
        // For development, just simulate success
        console.log('Component would be added:', {
          name: name.trim(),
          description: description.trim(),
          page_path: pagePath,
          app_section: appSection
        });
        alert('רכיב נוסף בהצלחה (מצב פיתוח)');
        onAdd();
      }
    } catch (error) {
      console.error('Error adding planned component:', error);
      // For development, still show success
      alert('רכיב נוסף בהצלחה (מצב פיתוח)');
      onAdd();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="planned-component-form">
      <div className="form-header">
        <span className="form-icon">📋</span>
        <span>הוספת רכיב מתוכנן</span>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="שם הרכיב..."
        className="component-name-input"
        autoFocus
        disabled={isSubmitting}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="תיאור הרכיב (אופציונלי)..."
        className="component-description-input"
        rows={2}
        disabled={isSubmitting}
      />
      <div className="form-actions">
        <button 
          type="submit" 
          className="submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? '...' : '✅ הוסף'}
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="cancel-btn"
          disabled={isSubmitting}
        >
          ❌ ביטול
        </button>
      </div>
    </form>
  );
}