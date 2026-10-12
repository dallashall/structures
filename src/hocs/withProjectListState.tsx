import React from 'react';

import type { StorageMetadata } from '../types';

import { storage } from '../core/Storage';
import { thumbnailStore } from '../core/ThumbnailStore';
import { renameProjectCommand, RenameProjectError } from '../commands/RenameProjectCommand';

/**
 * Props injected by withProjectListState HOC
 */
export interface WithProjectListStateProps {
  projects: StorageMetadata[];
  isLoadingProjects: boolean;
  selectedProjectId: string | null;
  isRenaming: boolean;
  renameError: string | null;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRenameProject: (projectId: string, name: string) => void;
}

const toRenameErrorMessage = (error: unknown): string =>
  error instanceof RenameProjectError ? error.message : 'The project could not be renamed.';

/**
 * HOC that bridges the Storage singleton to the project browser.
 *
 * Lists projects on mount, and again on project:renamed, project:deleted, and thumbnail:saved.
 * Holds which card is selected and whether its name is being edited. No other part of the app reads either.
 */
export function withProjectListState<P extends object>(
  Component: React.ComponentType<P & WithProjectListStateProps>,
) {
  return function WithProjectListState(props: P) {
    const [projects, setProjects] = React.useState<StorageMetadata[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
    const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [renameError, setRenameError] = React.useState<string | null>(null);

    React.useEffect(() => {
      let isMounted = true;

      const loadProjects = async (): Promise<void> => {
        const projectList = await storage.listProjects();
        if (!isMounted) return;
        setProjects(projectList);
        setIsLoadingProjects(false);
      };

      const reloadProjects = (): void => {
        void loadProjects();
      };

      void loadProjects();
      storage.on('project:renamed', reloadProjects);
      storage.on('project:deleted', reloadProjects);
      // Leaving the editor saves a thumbnail, which can land after this list first loads
      thumbnailStore.on('thumbnail:saved', reloadProjects);

      return () => {
        isMounted = false;
        storage.off('project:renamed', reloadProjects);
        storage.off('project:deleted', reloadProjects);
        thumbnailStore.off('thumbnail:saved', reloadProjects);
      };
    }, []);

    const stopRenaming = (): void => {
      setIsRenaming(false);
      setRenameError(null);
    };

    const handleSelectProject = (projectId: string): void => {
      if (projectId !== selectedProjectId) stopRenaming();
      setSelectedProjectId(projectId);
    };

    const handleDeleteProject = (projectId: string): void => {
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        stopRenaming();
      }
      void storage.deleteProject(projectId);
    };

    const handleStartRename = (): void => {
      setRenameError(null);
      setIsRenaming(true);
    };

    const handleRenameProject = (projectId: string, name: string): void => {
      const showError = (error: unknown): void => setRenameError(toRenameErrorMessage(error));
      renameProjectCommand.execute(projectId, name).then(stopRenaming, showError);
    };

    return (
      <Component
        {...props}
        projects={projects}
        isLoadingProjects={isLoadingProjects}
        selectedProjectId={selectedProjectId}
        isRenaming={isRenaming}
        renameError={renameError}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        onStartRename={handleStartRename}
        onCancelRename={stopRenaming}
        onRenameProject={handleRenameProject}
      />
    );
  };
}
