import React from 'react';
import { projectManager } from "../core/ProjectManager";
import { modelHistory } from "../core/ModelHistory";
import type { Project } from "../types";

/**
 * Props injected by withProjectState HOC
 */
export interface WithProjectStateProps {
  project: Project | null;
}

/**
 * Higher-Order Component that subscribes to ProjectManager and ModelHistory events
 * and provides current project state to wrapped component.
 *
 * Subscribes to:
 * - project:created (ProjectManager)
 * - project:loaded (ProjectManager)
 * - model:updated (ModelHistory)
 *
 * Injects props:
 * - project: Project | null - The current project state
 *
 * @example
 * const EnhancedComponent = withProjectState(MyComponent);
 */
export function withProjectState<P extends object>(
  Component: React.ComponentType<P & WithProjectStateProps>,
) {
  return function WithProjectState(props: P) {
    const [project, setProject] = React.useState<Project | null>(
      projectManager.getProject(),
    );

    React.useEffect(() => {
      const handleProjectCreated = (newProject: Project) => {
        setProject(newProject);
      };

      const handleProjectLoaded = (loadedProject: Project) => {
        setProject(loadedProject);
      };

      const handleModelUpdated = () => {
        // Model updated - get fresh computed state from projectManager
        const currentProject = projectManager.getProject();
        if (currentProject) {
          // Shallow copy to create new reference for React re-render
          setProject({ ...currentProject });
        }
      };

      // Subscribe to project lifecycle events
      projectManager.on("project:created", handleProjectCreated);
      projectManager.on("project:loaded", handleProjectLoaded);

      // Subscribe to model updates (replaces 'project:changed')
      modelHistory.on("model:updated", handleModelUpdated);

      // Cleanup
      return () => {
        projectManager.off("project:created", handleProjectCreated);
        projectManager.off("project:loaded", handleProjectLoaded);
        modelHistory.off("model:updated", handleModelUpdated);
      };
    }, []);

    return <Component {...props} project={project} />;
  };
}
