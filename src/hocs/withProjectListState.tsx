import React from 'react';

import type { StorageMetadata } from '../types';

import { storage } from '../core/Storage';

/**
 * Props injected by withProjectListState HOC
 */
export interface WithProjectListStateProps {
  projects: StorageMetadata[];
  isLoadingProjects: boolean;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

/**
 * HOC that bridges the Storage singleton to the project browser.
 *
 * Lists projects on mount and again on project:deleted.
 * Holds which card is selected, a view-local choice that no other part of the app reads.
 */
export function withProjectListState<P extends object>(
  Component: React.ComponentType<P & WithProjectListStateProps>,
) {
  return function WithProjectListState(props: P) {
    const [projects, setProjects] = React.useState<StorageMetadata[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);

    React.useEffect(() => {
      let isMounted = true;

      const loadProjects = async (): Promise<void> => {
        const projectList = await storage.listProjects();
        if (!isMounted) return;
        setProjects(projectList);
        setIsLoadingProjects(false);
      };

      const handleProjectDeleted = (): void => {
        void loadProjects();
      };

      void loadProjects();
      storage.on('project:deleted', handleProjectDeleted);

      return () => {
        isMounted = false;
        storage.off('project:deleted', handleProjectDeleted);
      };
    }, []);

    const handleSelectProject = (projectId: string): void => {
      setSelectedProjectId(projectId);
    };

    const handleDeleteProject = (projectId: string): void => {
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      void storage.deleteProject(projectId);
    };

    return (
      <Component
        {...props}
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
      />
    );
  };
}
