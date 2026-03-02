import { Flex, Button, Text, Heading, Divider, View } from '@adobe/react-spectrum';
import Add from '@spectrum-icons/workflow/Add';
import SaveFloppy from '@spectrum-icons/workflow/SaveFloppy';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import ViewGrid from '@spectrum-icons/workflow/ViewGrid';

interface ToolbarProps {
  projectName: string | null;
  onNewProject: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onToggle3D: () => void;
  is3DMode: boolean;
}

/**
 * Toolbar - Application header with primary actions
 *
 * Displays project name and provides buttons for:
 * - Creating new projects
 * - Saving current project
 * - Opening existing projects
 * - Toggling between 2D editor and 3D preview
 *
 * Uses React Spectrum components for consistent theming and
 * automatic light/dark mode support.
 */
export function Toolbar({
  projectName,
  onNewProject,
  onSaveProject,
  onOpenProject,
  onToggle3D,
  is3DMode,
}: ToolbarProps) {
  const handleNewClick = () => {
    onNewProject();
  };

  const handleSaveClick = () => {
    onSaveProject();
  };

  const handleOpenClick = () => {
    onOpenProject();
  };

  const handleToggle3DClick = () => {
    onToggle3D();
  };

  return (
    <View padding="size-150" borderBottomWidth="thick">
      <Flex direction="row" alignItems="center" gap="size-200">
        {/* Project Name */}
        <View flex={1}>
          <Heading level={1} margin={0}>
            {projectName || 'Minecraft Magic Blueprint'}
          </Heading>
          {projectName && <Text>Project</Text>}
        </View>

        {/* Action Buttons */}
        <Flex direction="row" gap="size-100" alignItems="center">
          <Button variant="primary" onPress={handleNewClick}>
            <Add />
            <Text>New</Text>
          </Button>

          <Button
            variant="secondary"
            onPress={handleSaveClick}
            isDisabled={!projectName}
          >
            <SaveFloppy />
            <Text>Save</Text>
          </Button>

          <Button variant="secondary" onPress={handleOpenClick}>
            <FolderOpen />
            <Text>Open</Text>
          </Button>

          <Divider orientation="vertical" size="S" />

          <Button
            variant={is3DMode ? 'accent' : 'secondary'}
            onPress={handleToggle3DClick}
          >
            <ViewGrid />
            <Text>{is3DMode ? '3D View' : '2D Editor'}</Text>
          </Button>
        </Flex>
      </Flex>
    </View>
  );
}
