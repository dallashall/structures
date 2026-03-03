import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import { Add, FolderOpen } from '@mui/icons-material';
import { storageManager } from '../core/StorageManager';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectMetadataPanel } from '../components/ProjectMetadataPanel';
import type { ProjectMetadata } from '../types';

interface WelcomeViewProps {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  onLoadFromFile: () => void;
}

/**
 * WelcomeView - Initial landing screen with project browser
 *
 * Features:
 * - Grid of project cards with thumbnails
 * - "New Project" button (prominent)
 * - "Load from File" button
 * - Select project to show metadata panel
 * - Open and delete actions for selected project
 *
 * Uses MUI Grid and Box components for layout.
 */
export function WelcomeView({
  onNewProject,
  onOpenProject,
  onLoadFromFile,
}: WelcomeViewProps) {
  const [projects, setProjects] = React.useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(true);

  // Load projects on mount
  React.useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      const projectList = await storageManager.listProjects();
      setProjects(projectList);
      setIsLoading(false);
    };

    loadProjects();
  }, []);

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleOpenProject = () => {
    if (selectedProjectId) {
      onOpenProject(selectedProjectId);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) {
      return;
    }

    await storageManager.deleteProject(selectedProjectId);

    // Refresh project list
    const projectList = await storageManager.listProjects();
    setProjects(projectList);
    setSelectedProjectId(null);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Box sx={{ p: 4, height: '100%', overflow: 'hidden' }}>
      <Stack spacing={3} sx={{ height: '100%' }}>
        {/* Header */}
        <Box>
          <Typography variant="h3" component="h1">
            Minecraft Magic Blueprint
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Design 3D Minecraft structures using a 2D pixel-art editor
          </Typography>
        </Box>

        <Divider />

        {/* Action Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={onNewProject}
            startIcon={<Add />}
          >
            New Project
          </Button>
          <Button
            variant="outlined"
            onClick={onLoadFromFile}
            startIcon={<FolderOpen />}
          >
            Load from File
          </Button>
        </Stack>

        {/* Content Area */}
        <Stack direction="row" spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Project Grid */}
          <Box sx={{ flex: 2, overflow: 'auto' }}>
            {isLoading ? (
              <Typography variant="body1">Loading projects...</Typography>
            ) : projects.length === 0 ? (
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  p: 2,
                  border: 1,
                  borderColor: 'grey.300',
                }}
              >
                <Typography variant="body1">
                  No projects yet. Create your first structure!
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 2,
                }}
              >
                {projects.map((project) => {
                  const handleClick = () => handleProjectClick(project.id);

                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isSelected={selectedProjectId === project.id}
                      onClick={handleClick}
                    />
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Metadata Panel */}
          <Box sx={{ flex: 1 }}>
            {selectedProject ? (
              <ProjectMetadataPanel
                project={selectedProject}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ) : (
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  p: 2,
                  border: 1,
                  borderColor: 'grey.300',
                }}
              >
                <Typography variant="body1">
                  Select a project to view details
                </Typography>
              </Box>
            )}
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
