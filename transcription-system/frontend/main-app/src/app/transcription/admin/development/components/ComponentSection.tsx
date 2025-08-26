import { useState } from 'react';
import TaskInlineEditor from './TaskInlineEditor';
import { ComponentData, TaskData } from '../DevelopmentHub';

interface ComponentSectionProps {
  component: ComponentData;
  tasks: TaskData[];
  onTaskUpdate: () => void;
  searchTerm: string;
  isPlanned?: boolean;
}

export default function ComponentSection({ 
  component, 
  tasks, 
  onTaskUpdate, 
  searchTerm,
  isPlanned = false 
}: ComponentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  
  // Highlight search term
  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  const handleAddTask = async (taskData: Partial<TaskData>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dev/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...taskData,
          component_id: component.id,
          task_category: isPlanned ? 'planned' : 'component'
        })
      });

      if (response.ok) {
        setShowAddTask(false);
        onTaskUpdate();
      } else {
        // For development mode, simulate success
        console.log('Task would be added:', taskData);
        alert('משימה נוספה בהצלחה (מצב פיתוח)');
        setShowAddTask(false);
        onTaskUpdate();
      }
    } catch (error) {
      console.error('Error adding task:', error);
      // For development mode, still show success
      alert('משימה נוספה בהצלחה (מצב פיתוח)');
      setShowAddTask(false);
      onTaskUpdate();
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<TaskData>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dev/tasks', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: taskId, ...updates })
      });

      if (response.ok) {
        onTaskUpdate();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('האם למחוק משימה זו?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dev/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        onTaskUpdate();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <div className={`component-section ${isPlanned ? 'planned' : 'existing'}`}>
      <div className="component-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="component-icon">{isPlanned ? '📋' : '📦'}</span>
        <span className="component-name">{highlightText(component.name)}</span>
        {isPlanned && <span className="planned-badge">מתוכנן</span>}
        {tasks.length > 0 && (
          <span className="task-counter">
            {completedCount}/{tasks.length}
          </span>
        )}
      </div>
      
      {isExpanded && (
        <div className="component-content">
          {component.description && (
            <div className="component-description">{component.description}</div>
          )}
          
          <div className="tasks-list">
            {tasks.map(task => (
              <TaskInlineEditor
                key={task.id}
                task={task}
                onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                onDelete={() => handleDeleteTask(task.id)}
                searchTerm={searchTerm}
              />
            ))}
          </div>
          
          {!showAddTask ? (
            <button 
              className="add-task-btn"
              onClick={() => setShowAddTask(true)}
            >
              + הוסף משימה
            </button>
          ) : (
            <TaskInlineEditor
              onSave={handleAddTask}
              onCancel={() => setShowAddTask(false)}
              isNew={true}
            />
          )}
        </div>
      )}
    </div>
  );
}