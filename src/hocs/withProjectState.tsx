import React from 'react';
import { projectView } from "../projections/ProjectView";
import { blockProjection } from "../projections/BlockProjection";
import { metadataProjection } from "../projections/MetadataProjection";
import type { Project } from "../types";

/**
 * Props injected by withProjectState HOC
 */
export interface WithProjectStateProps {
  project: Project | null;
}

/**
 * Higher-Order Component that subscribes to projections and provides
 * current project state to wrapped component.
 *
 * Linear flow architecture:
 * - Subscribes to rebuild events from both projections
 * - Queries state via ProjectView.getProject()
 * - No cascading events, just signal → query
 *
 * Subscribes to:
 * - blocks:rebuilt (BlockProjection) - Blocks changed
 * - metadata:rebuilt (MetadataProjection) - Metadata changed
 *
 * Injects props:
 * - project: Project | null - The complete project state
 *
 * @example
 * const EnhancedComponent = withProjectState(MyComponent);
 */
export function withProjectState<P extends object>(
  Component: React.ComponentType<P & WithProjectStateProps>,
) {
  return function WithProjectState(props: P) {
    const [project, setProject] = React.useState<Project | null>(null);

    // Initial load
    React.useEffect(() => {
      let isMounted = true;

      const loadProject = async () => {
        const proj = await projectView.getProject();
        if (isMounted) {
          setProject(proj);
        }
      };

      loadProject();

      return () => {
        isMounted = false;
      };
    }, []);

    // Subscribe to updates
    React.useEffect(() => {
      const handleProjectionCalculated = async () => {
        const proj = await projectView.getProject();
        setProject(proj);
      };

      // Subscribe to both projections
      blockProjection.on("blocks:rebuilt", handleProjectionCalculated);
      metadataProjection.on("metadata:rebuilt", handleProjectionCalculated);

      // Cleanup
      return () => {
        blockProjection.off("blocks:rebuilt", handleProjectionCalculated);
        metadataProjection.off("metadata:rebuilt", handleProjectionCalculated);
      };
    }, []);

    return <Component {...props} project={project} />;
  };
}
