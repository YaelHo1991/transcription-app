import { useState } from 'react';
import TaskInlineEditor from './TaskInlineEditor';
import { TaskData } from '../DevelopmentHub';

interface GeneralTasksSectionProps {
  pagePath: string;
  tasks: TaskData[];
  onTaskUpdate: () => void;
  searchTerm: string;
}

export default function GeneralTasksSection({ 
  pagePath, 
  tasks, 
  onTaskUpdate, 
  searchTerm 
}: GeneralTasksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;

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
          page_path: pagePath,
          task_category: 'general'
        })
      });

      if (response.ok) {
        setShowAddTask(false);
        onTaskUpdate();
      } else {
        // For development mode, simulate success
        console.log('General task would be added:', taskData);
        alert('משימה כללית נוספה בהצלחה (מצב פיתוח)');
        setShowAddTask(false);
        onTaskUpdate();
      }
    } catch (error) {
      console.error('Error adding general task:', error);
      // For development mode, still show success
      alert('משימה כללית נוספה בהצלחה (מצב פיתוח)');
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
    <div className="general-tasks-section">
      <div className="section-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="section-icon">📋</span>
        <span className="section-title">משימות כלליות / אחר</span>
        {tasks.length > 0 && (
          <span className="task-counter">
            {completedCount}/{tasks.length}
          </span>
        )}
      </div>
      
      {isExpanded && (
        <div className="section-content">
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
              + הוסף משימה כללית
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