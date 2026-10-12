import React from 'react';
import { projectView } from "../projections/ProjectView";
import { modelProjection } from "../projections/ModelProjection";
import { metadataProjection } from "../projections/MetadataProjection";
import type { Project } from "../types";

export interface WithProjectStateProps {
  project: Project | null;
}

/**
 * HOC that passes the open project. A rebuild event from either projection is only a signal:
 * the HOC then reads the joined project from ProjectView, so it never merges event payloads itself.
 */
export function withProjectState<P extends object>(
  Component: React.ComponentType<P & WithProjectStateProps>,
) {
  return function WithProjectState(props: P) {
    const [project, setProject] = React.useState<Project | null>(null);

    const loadInitialProject = (): (() => void) => {
      let isMounted = true;

      const loadProject = async () => {
        const proj = await projectView.getProject();
        if (isMounted) {
          setProject(proj);
        }
      };

      loadProject();

      const cancelInitialLoad = (): void => {
        isMounted = false;
      };
      return cancelInitialLoad;
    };
    React.useEffect(loadInitialProject, []);

    const subscribe = (): (() => void) => {
      const handleProjectionCalculated = async () => {
        const proj = await projectView.getProject();
        setProject(proj);
      };

      modelProjection.on("model:rebuilt", handleProjectionCalculated);
      metadataProjection.on("metadata:rebuilt", handleProjectionCalculated);

      const unsubscribe = (): void => {
        modelProjection.off("model:rebuilt", handleProjectionCalculated);
        metadataProjection.off("metadata:rebuilt", handleProjectionCalculated);
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    return <Component {...props} project={project} />;
  };
}
