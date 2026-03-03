import React from 'react';
import { projectManager } from '../core/ProjectManager';
import type { Project } from '../types';

/**
 * Props injected by withProjectState HOC
 */
export interface WithProjectStateProps {
  project: Project | null;
}

/**
 * Higher-Order Component that subscribes to ProjectManager events
 * and provides current project state to wrapped component.
 *
 * Subscribes to:
 * - project:created
 * - project:loaded
 * - project:changed
 *
 * Injects props:
 * - project: Project | null - The current project state
 *
 * @example
 * const EnhancedComponent = withProjectState(MyComponent);
 */
export function withProjectState<P extends object>(
  Component: React.ComponentType<P & WithProjectStateProps>
) {
  return function WithProjectState(props: P) {
    const [project, setProject] = React.useState<Project | null>(
      projectManager.getProject()
    );

    React.useEffect(() => {
      const handleProjectCreated = (newProject: Project) => {
        setProject(newProject);
      };

      const handleProjectLoaded = (loadedProject: Project) => {
        setProject(loadedProject);
      };

      const handleProjectChanged = () => {
        // Create a new object reference to force React re-render
        const currentProject = projectManager.getProject();
        if (currentProject) {
          // Shallow copy to create new reference
          setProject({ ...currentProject });
        }
      };

      const handleWindowProjectChanged = (event: Event) => {
        const customEvent = event as CustomEvent<{ project: Project }>;
        // Create a new object reference from window event
        setProject({ ...customEvent.detail.project });
      };

      // Subscribe to EventEmitter events (for project create/load)
      projectManager.on('project:created', handleProjectCreated);
      projectManager.on('project:loaded', handleProjectLoaded);
      projectManager.on('project:changed', handleProjectChanged);

      // Also listen to window events for cross-module updates
      window.addEventListener('project:changed', handleWindowProjectChanged);
      window.addEventListener('block:added', handleWindowProjectChanged);
      window.addEventListener('block:removed', handleWindowProjectChanged);

      // Cleanup
      return () => {
        projectManager.off('project:created', handleProjectCreated);
        projectManager.off('project:loaded', handleProjectLoaded);
        projectManager.off('project:changed', handleProjectChanged);
        window.removeEventListener('project:changed', handleWindowProjectChanged);
        window.removeEventListener('block:added', handleWindowProjectChanged);
        window.removeEventListener('block:removed', handleWindowProjectChanged);
      };
    }, []);

    return <Component {...props} project={project} />;
  };
}
