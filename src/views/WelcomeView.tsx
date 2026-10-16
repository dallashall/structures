import { Box, Stack, Typography, Button, Divider } from "@mui/material";
import { Add, FolderOpen, InfoOutlined } from "@mui/icons-material";

import type { StorageMetadata } from "../types";

import { withProjectListState } from "../hocs/withProjectListState";
import type { WithProjectListStateProps } from "../hocs/withProjectListState";

import { ProjectCard } from "../components/ProjectCard";
import { ProjectDetails } from "../components/ProjectDetails";
import { TexturesMissingAlert } from "../components/TexturesMissingAlert";
import { ThemeChoiceMenu } from "../components/ThemeChoiceMenu";

interface WelcomeViewOwnProps {
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  onLoadFromFile: () => void;
  onShowCredits: () => void;
  areTexturesMissing: boolean;
}

type WelcomeViewProps = WelcomeViewOwnProps & WithProjectListStateProps;

function WelcomeViewComponent({
  onNewProject,
  onOpenProject,
  onLoadFromFile,
  onShowCredits,
  areTexturesMissing,
  projects,
  isLoadingProjects,
  selectedProjectId,
  isRenaming,
  renameError,
  onSelectProject,
  onDeleteProject,
  onStartRename,
  onCancelRename,
  onRenameProject,
}: WelcomeViewProps) {
  const isSelectedProject = (project: StorageMetadata): boolean =>
    project.id === selectedProjectId;
  const selectedProject = projects.find(isSelectedProject);

  const createProjectClickHandler = (projectId: string) => () => {
    onSelectProject(projectId);
  };

  const renderProjectCard = (project: StorageMetadata) => (
    <ProjectCard
      key={project.id}
      project={project}
      isSelected={selectedProjectId === project.id}
      onClick={createProjectClickHandler(project.id)}
    />
  );

  const handleOpenSelected = () => {
    if (selectedProject) {
      onOpenProject(selectedProject.id);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProject) {
      onDeleteProject(selectedProject.id);
    }
  };

  const handleRenameSelected = (name: string) => {
    if (selectedProject) {
      onRenameProject(selectedProject.id, name);
    }
  };

  return (
    <Box sx={{ p: 4, height: "100%", overflow: "hidden" }}>
      <Stack spacing={3} sx={{ height: "100%" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            component="img"
            src="/logo-256.png"
            alt=""
            sx={{ width: 72, height: 72 }}
          />
          <Box>
            <Typography variant="h3" component="h1">
              Structures
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Design 3D Minecraft structures using a 2D pixel-art editor
            </Typography>
          </Box>
        </Stack>

        <Divider />

        {areTexturesMissing && <TexturesMissingAlert />}

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
          <Box sx={{ flex: 1 }} />
          <ThemeChoiceMenu />
          <Button
            variant="text"
            onClick={onShowCredits}
            startIcon={<InfoOutlined />}
          >
            Credits
          </Button>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ flex: 1, overflow: "hidden" }}>
          <Box sx={{ flex: 2, overflow: "auto" }}>
            {isLoadingProjects ? (
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
                {projects.map(renderProjectCard)}
              </Box>
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            {selectedProject ? (
              <ProjectDetails
                project={selectedProject}
                isRenaming={isRenaming}
                renameError={renameError}
                onOpen={handleOpenSelected}
                onDelete={handleDeleteSelected}
                onStartRename={onStartRename}
                onCancelRename={onCancelRename}
                onRename={handleRenameSelected}
              />
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

export const WelcomeView = withProjectListState<WelcomeViewOwnProps>(WelcomeViewComponent);
