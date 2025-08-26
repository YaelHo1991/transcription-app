import { useState } from 'react';
import ComponentSection from './ComponentSection';
import PlannedComponentForm from './PlannedComponentForm';
import GeneralTasksSection from './GeneralTasksSection';
import { PageStructure, ComponentData, TaskData } from '../DevelopmentHub';

interface PageNodeProps {
  page: PageStructure;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onTaskUpdate: () => void;
  searchTerm: string;
}

export default function PageNode({ 
  page, 
  isExpanded, 
  hasChildren, 
  onToggle, 
  onTaskUpdate,
  searchTerm 
}: PageNodeProps) {
  const [showAddComponent, setShowAddComponent] = useState(false);
  
  // Separate components by type
  const existingComponents = page.components?.filter(c => !c.is_planned) || [];
  const plannedComponents = page.components?.filter(c => c.is_planned) || [];
  
  // Separate tasks by category
  const componentTasks = page.tasks?.filter(t => t.task_category === 'component') || [];
  const plannedTasks = page.tasks?.filter(t => t.task_category === 'planned') || [];
  const generalTasks = page.tasks?.filter(t => t.task_category === 'general') || [];
  
  const totalTaskCount = page.tasks?.length || 0;
  const completedCount = page.tasks?.filter(t => t.status === 'completed').length || 0;

  return (
    <div className="page-node">
      <div className="page-header" onClick={onToggle}>
        <span className="expand-icon">
          {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
        </span>
        <span className="page-icon">📁</span>
        <span className="page-path">{page.page_path}</span>
        <span className="page-name">({page.page_name})</span>
        {totalTaskCount > 0 && (
          <span className="task-counter">
            {completedCount}/{totalTaskCount}
          </span>
        )}
      </div>
      
      {isExpanded && (
        <div className="page-content">
          {/* Existing Components */}
          {existingComponents.length > 0 && (
            <div className="components-section">
              <h4>📦 רכיבים קיימים</h4>
              {existingComponents.map(component => (
                <ComponentSection
                  key={component.id}
                  component={component}
                  tasks={componentTasks.filter(t => t.component_id === component.id)}
                  onTaskUpdate={onTaskUpdate}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
          
          {/* Planned Components */}
          {plannedComponents.length > 0 && (
            <div className="planned-section">
              <h4>📋 רכיבים מתוכננים</h4>
              {plannedComponents.map(component => (
                <ComponentSection
                  key={component.id}
                  component={component}
                  tasks={plannedTasks.filter(t => t.component_id === component.id)}
                  onTaskUpdate={onTaskUpdate}
                  searchTerm={searchTerm}
                  isPlanned={true}
                />
              ))}
            </div>
          )}
          
          {/* Add New Component Button/Form */}
          <div className="add-component-section">
            {!showAddComponent ? (
              <button 
                className="add-component-btn"
                onClick={() => setShowAddComponent(true)}
              >
                ➕ הוסף רכיב חדש
              </button>
            ) : (
              <PlannedComponentForm
                pagePath={page.page_path}
                appSection={page.app_section}
                onAdd={() => {
                  setShowAddComponent(false);
                  onTaskUpdate();
                }}
                onCancel={() => setShowAddComponent(false)}
              />
            )}
          </div>
          
          {/* General/Other Tasks */}
          <GeneralTasksSection
            pagePath={page.page_path}
            tasks={generalTasks}
            onTaskUpdate={onTaskUpdate}
            searchTerm={searchTerm}
          />
        </div>
      )}
    </div>
  );
}