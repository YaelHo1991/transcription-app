import { useState } from 'react';
import PageNode from './PageNode';
import { PageStructure } from '../DevelopmentHub';

interface AppStructureTreeProps {
  pages: PageStructure[];
  searchTerm: string;
  onTaskUpdate: () => void;
}

export default function AppStructureTree({ pages, searchTerm, onTaskUpdate }: AppStructureTreeProps) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  const togglePage = (pagePath: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pagePath)) {
      newExpanded.delete(pagePath);
    } else {
      newExpanded.add(pagePath);
    }
    setExpandedPages(newExpanded);
  };

  // Filter pages based on search term
  const filteredPages = pages.filter(page => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    // Check page name
    if (page.page_name.toLowerCase().includes(term)) return true;
    
    // Check page path
    if (page.page_path.toLowerCase().includes(term)) return true;
    
    // Check components
    if (page.components?.some(c => c.name.toLowerCase().includes(term))) return true;
    
    // Check tasks
    if (page.tasks?.some(t => t.title.toLowerCase().includes(term))) return true;
    
    return false;
  });

  // Build tree hierarchy
  const buildTree = () => {
    const rootPages = filteredPages.filter(p => !p.parent_path);
    const childMap = new Map<string, PageStructure[]>();
    
    filteredPages.forEach(page => {
      if (page.parent_path) {
        if (!childMap.has(page.parent_path)) {
          childMap.set(page.parent_path, []);
        }
        childMap.get(page.parent_path)?.push(page);
      }
    });

    return { rootPages, childMap };
  };

  const { rootPages, childMap } = buildTree();

  const renderPageTree = (page: PageStructure, depth = 0) => {
    const children = childMap.get(page.page_path) || [];
    const hasChildren = children.length > 0 || page.components?.length > 0 || page.tasks?.length > 0;
    
    return (
      <div key={page.id} className="tree-node" style={{ marginLeft: `${depth * 20}px` }}>
        <PageNode
          page={page}
          isExpanded={expandedPages.has(page.page_path)}
          hasChildren={hasChildren}
          onToggle={() => togglePage(page.page_path)}
          onTaskUpdate={onTaskUpdate}
          searchTerm={searchTerm}
        />
        
        {expandedPages.has(page.page_path) && children.length > 0 && (
          <div className="tree-children">
            {children.map(child => renderPageTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (filteredPages.length === 0) {
    return (
      <div className="no-results">
        {searchTerm 
          ? `לא נמצאו תוצאות עבור "${searchTerm}"`
          : 'אין דפים בקטגוריה זו'}
      </div>
    );
  }

  return (
    <div className="app-structure-tree">
      {rootPages.map(page => renderPageTree(page))}
    </div>
  );
}