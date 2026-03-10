import { Box, Stack, Typography, Button, Divider } from "@mui/material";
import { useState, useEffect } from "react";
import { Add, FolderOpen } from "@mui/icons-material";
import { storage } from "../core/Storage";
import { ProjectCard } from "../components/ProjectCard";
import type { StorageMetadata } from "../types";

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
  const [projects, setProjects] = useState<StorageMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      const projectList = await storage.listProjects();
      setProjects(projectList);
      setIsLoading(false);
    };

    loadProjects();
  }, []);

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleOpenProjectById = (projectId: string) => {
    onOpenProject(projectId);
  };

  const handleDeleteProjectById = (projectId: string) => {
    storage.deleteProject(projectId);
    const projectList = storage.listProjects();
    setProjects(projectList);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Box sx={{ p: 4, height: "100%", overflow: "hidden" }}>
      <Stack spacing={3} sx={{ height: "100%" }}>
        {/* Header */}
        <Box>
          <Typography variant="h3" component="h1">
            Structures
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
        <Stack direction="row" spacing={3} sx={{ flex: 1, overflow: "hidden" }}>
          {/* Project Grid */}
          <Box sx={{ flex: 2, overflow: "auto" }}>
            {isLoading ? (
              <Typography variant="body1">Loading projects...</Typography>
            ) : projects.length === 0 ? (
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  p: 3,
                  border: 1,
                  borderColor: "divider",
                  textAlign: "center",
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No projects yet. Create your first structure!
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
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
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">{selectedProject.name}</Typography>
                <Typography variant="body2">
                  Created: {selectedProject.created.toLocaleDateString()}
                </Typography>
                <Button onClick={() => handleOpenProjectById(selectedProject.id)}>
                  Open
                </Button>
                <Button onClick={() => handleDeleteProjectById(selectedProject.id)}>
                  Delete
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  p: 3,
                  border: 1,
                  borderColor: "divider",
                  textAlign: "center",
                }}
              >
                <Typography variant="body1" color="text.secondary">
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
