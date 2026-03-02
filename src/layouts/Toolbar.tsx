import { Flex, Button, Text, Heading, Divider, View, Picker, Item } from '@adobe/react-spectrum';
import Add from '@spectrum-icons/workflow/Add';
import SaveFloppy from '@spectrum-icons/workflow/SaveFloppy';
import FolderOpen from '@spectrum-icons/workflow/FolderOpen';
import type { LayoutMode } from '../types';

interface ToolbarProps {
  projectName: string | null;
  layoutMode: LayoutMode;
  onNewProject: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
  // Optional props for preview compatibility (3D feature not yet implemented)
  onToggle3D?: () => void;
  is3DMode?: boolean;
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
  layoutMode,
  onNewProject,
  onSaveProject,
  onOpenProject,
  onLayoutModeChange,
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

  const handleLayoutModeChange = (key: React.Key | null) => {
    if (key !== null) {
      onLayoutModeChange(key as LayoutMode);
    }
  };

  return (
    <View padding="size-150" borderBottomWidth="thick">
      <Flex
        direction={{ base: 'column', L: 'row' }}
        alignItems={{ base: 'stretch', L: 'center' }}
        gap="size-200"
      >
        {/* Project Name */}
        <View flex={{ L: 1 }} minWidth={0}>
          <Heading level={1} margin={0} UNSAFE_style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName || 'Minecraft Magic Blueprint'}
          </Heading>
          {projectName && <Text>Project</Text>}
        </View>

        {/* Action Buttons */}
        <Flex
          direction={{ base: 'column', M: 'row' }}
          gap="size-100"
          alignItems="center"
          wrap
        >
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

          <Divider orientation="vertical" size="S" isHidden={{ base: true, M: false }} />

          <Picker
            label="View Mode"
            selectedKey={layoutMode}
            onSelectionChange={handleLayoutModeChange}
            width={{ base: '100%', M: 'size-2000' }}
          >
            <Item key="tabbed">Tabbed</Item>
            <Item key="quad">Quad Layout</Item>
          </Picker>
        </Flex>
      </Flex>
    </View>
  );
}
