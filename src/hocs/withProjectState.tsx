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

      const handleProjectChanged = (updatedProject: Project) => {
        setProject(updatedProject);
      };

      // Subscribe to events
      projectManager.on('project:created', handleProjectCreated);
      projectManager.on('project:loaded', handleProjectLoaded);
      projectManager.on('project:changed', handleProjectChanged);

      // Cleanup
      return () => {
        projectManager.off('project:created', handleProjectCreated);
        projectManager.off('project:loaded', handleProjectLoaded);
        projectManager.off('project:changed', handleProjectChanged);
      };
    }, []);

    return <Component {...props} project={project} />;
  };
}
