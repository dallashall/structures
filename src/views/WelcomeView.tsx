import React from 'react';
import {
  View,
  Flex,
  Heading,
  Button,
  Text,
  Grid,
  Content,
  Well,
  Divider,
  ActionButton,
  DialogTrigger,
  AlertDialog,
  Image,
} from '@adobe/react-spectrum';
import Add from '@spectrum-icons/workflow/Add';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import Delete from '@spectrum-icons/workflow/Delete';
import { storageManager } from '../core/StorageManager';
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
 * Uses React Spectrum Grid and Well components for layout.
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
    <View padding="size-400" height="100%" overflow="hidden">
      <Flex direction="column" gap="size-300" height="100%">
        {/* Header */}
        <View>
          <Heading level={1}>Minecraft Magic Blueprint</Heading>
          <Text>Design 3D Minecraft structures using a 2D pixel-art editor</Text>
        </View>

        <Divider size="M" />

        {/* Action Buttons */}
        <Flex direction="row" gap="size-200">
          <Button variant="accent" onPress={onNewProject}>
            <Add />
            <Text>New Project</Text>
          </Button>
          <Button variant="secondary" onPress={onLoadFromFile}>
            <FolderOpen />
            <Text>Load from File</Text>
          </Button>
        </Flex>

        {/* Content Area */}
        <Flex direction="row" gap="size-300" flex={1}>
          {/* Project Grid */}
          <View flex={2} overflow="auto">
            {isLoading ? (
              <Text>Loading projects...</Text>
            ) : projects.length === 0 ? (
              <Well>
                <Content>
                  <Text>No projects yet. Create your first structure!</Text>
                </Content>
              </Well>
            ) : (
              <Grid
                columns={['1fr', '1fr', '1fr']}
                autoRows="size-2400"
                gap="size-200"
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
              </Grid>
            )}
          </View>

          {/* Metadata Panel */}
          <View flex={1}>
            {selectedProject ? (
              <ProjectMetadataPanel
                project={selectedProject}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ) : (
              <Well>
                <Content>
                  <Text>Select a project to view details</Text>
                </Content>
              </Well>
            )}
          </View>
        </Flex>
      </Flex>
    </View>
  );
}

/**
 * ProjectCard - Individual project card in grid
 */
interface ProjectCardProps {
  project: ProjectMetadata;
  isSelected: boolean;
  onClick: () => void;
}

function ProjectCard({ project, isSelected, onClick }: ProjectCardProps) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <View
        borderWidth={isSelected ? 'thick' : 'thin'}
        borderColor={isSelected ? 'blue-500' : 'gray-300'}
        borderRadius="medium"
        padding="size-100"
        backgroundColor="gray-50"
      >
        <Flex direction="column" gap="size-100">
          {/* Thumbnail */}
          <View backgroundColor="gray-200" height="size-2000" borderRadius="medium">
            <Flex height="100%" alignItems="center" justifyContent="center">
              {project.thumbnail ? (
                <Image
                  src={project.thumbnail}
                  alt={project.name}
                  objectFit="contain"
                  width="100%"
                  height="100%"
                />
              ) : (
                <Text>No thumbnail</Text>
              )}
            </Flex>
          </View>

          {/* Project Name */}
          <Heading level={4} marginTop="size-100">
            {project.name}
          </Heading>
        </Flex>
      </View>
    </div>
  );
}

/**
 * ProjectMetadataPanel - Shows detailed info for selected project
 */
interface ProjectMetadataPanelProps {
  project: ProjectMetadata;
  onOpen: () => void;
  onDelete: () => void;
}

function ProjectMetadataPanel({
  project,
  onOpen,
  onDelete,
}: ProjectMetadataPanelProps) {
  return (
    <Well>
      <Flex direction="column" gap="size-200">
        <Heading level={3}>{project.name}</Heading>

        <Divider size="S" />

        <View>
          <Text>
            <strong>Created:</strong> {project.created.toLocaleDateString()}
          </Text>
          <Text>
            <strong>Modified:</strong> {project.modified.toLocaleDateString()}
          </Text>
          <Text>
            <strong>Dimensions:</strong> {project.dimensions.width} ×{' '}
            {project.dimensions.height} × {project.dimensions.depth}
          </Text>
          <Text>
            <strong>Blocks:</strong> {project.blockCount}
          </Text>
        </View>

        <Divider size="S" />

        <Flex direction="column" gap="size-100">
          <Button variant="accent" onPress={onOpen}>
            Open Project
          </Button>

          <DialogTrigger>
            <ActionButton>
              <Delete />
              <Text>Delete Project</Text>
            </ActionButton>
            <AlertDialog
              variant="destructive"
              title="Delete Project"
              primaryActionLabel="Delete"
              cancelLabel="Cancel"
              onPrimaryAction={onDelete}
            >
              Are you sure you want to delete "{project.name}"? This action cannot
              be undone.
            </AlertDialog>
          </DialogTrigger>
        </Flex>
      </Flex>
    </Well>
  );
}
