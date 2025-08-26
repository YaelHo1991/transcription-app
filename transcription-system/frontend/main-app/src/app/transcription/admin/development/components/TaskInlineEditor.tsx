import { useState } from 'react';
import { TaskData } from '../DevelopmentHub';

interface TaskInlineEditorProps {
  task?: TaskData;
  onUpdate?: (updates: Partial<TaskData>) => void;
  onDelete?: () => void;
  onSave?: (task: Partial<TaskData>) => void;
  onCancel?: () => void;
  searchTerm?: string;
  isNew?: boolean;
}

export default function TaskInlineEditor({
  task,
  onUpdate,
  onDelete,
  onSave,
  onCancel,
  searchTerm,
  isNew = false
}: TaskInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [editData, setEditData] = useState<Partial<TaskData>>({
    title: task?.title || '',
    content: task?.content || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo'
  });

  const statusColors = {
    idea: '#f59e0b',
    todo: '#3b82f6',
    in_progress: '#22c55e',
    completed: '#10b981',
    cancelled: '#6b7280'
  };

  const priorityColors = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#dc2626'
  };

  const handleSave = () => {
    if (isNew && onSave) {
      onSave(editData);
    } else if (onUpdate) {
      onUpdate(editData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (isNew && onCancel) {
      onCancel();
    } else {
      setEditData({
        title: task?.title || '',
        content: task?.content || '',
        priority: task?.priority || 'medium',
        status: task?.status || 'todo'
      });
      setIsEditing(false);
    }
  };

  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  if (isEditing) {
    return (
      <div className="task-editor">
        <input
          type="text"
          value={editData.title}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          placeholder="Task title..."
          className="task-title-input"
          autoFocus
        />
        <textarea
          value={editData.content}
          onChange={(e) => setEditData({ ...editData, content: e.target.value })}
          placeholder="Task description..."
          className="task-content-input"
          rows={2}
        />
        <div className="task-controls">
          <select
            value={editData.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value as TaskData['status'] })}
          >
            <option value="idea">💡 Idea</option>
            <option value="todo">📝 Todo</option>
            <option value="in_progress">🚀 In Progress</option>
            <option value="completed">✅ Completed</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>
          <select
            value={editData.priority}
            onChange={(e) => setEditData({ ...editData, priority: e.target.value as TaskData['priority'] })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button onClick={handleSave} className="save-btn">💾</button>
          <button onClick={handleCancel} className="cancel-btn">❌</button>
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="task-item">
      <div className="task-status">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={() => onUpdate?.({ status: task.status === 'completed' ? 'todo' : 'completed' })}
        />
      </div>
      <div 
        className="task-priority-indicator"
        style={{ backgroundColor: priorityColors[task.priority] }}
        title={task.priority}
      />
      <div className="task-content">
        <div className="task-title">{highlightText(task.title)}</div>
        {task.content && (
          <div className="task-description">{highlightText(task.content)}</div>
        )}
      </div>
      <div className="task-actions">
        <span 
          className="task-status-badge"
          style={{ backgroundColor: statusColors[task.status] }}
        >
          {task.status}
        </span>
        <button onClick={() => setIsEditing(true)} className="edit-btn">✏️</button>
        <button onClick={onDelete} className="delete-btn">🗑️</button>
      </div>
    </div>
  );
}