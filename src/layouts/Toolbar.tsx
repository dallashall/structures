import {
  Box,
  Stack,
  Button,
  Typography,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { Add, Save, FolderOpen } from '@mui/icons-material';
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
 * Uses MUI components for consistent theming and
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

  const handleLayoutModeChange = (event: SelectChangeEvent<LayoutMode>) => {
    onLayoutModeChange(event.target.value as LayoutMode);
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderBottom: 2,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems={{ xs: 'stretch', lg: 'center' }}
        spacing={2}
      >
        {/* Project Name */}
        <Box
          sx={{
            flex: { lg: 1 },
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              m: 0,
            }}
          >
            {projectName || 'Minecraft Magic Blueprint'}
          </Typography>
          {projectName && (
            <Typography variant="caption" color="text.secondary">
              Project
            </Typography>
          )}
        </Box>

        {/* Action Buttons */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
        >
          <Button
            variant="contained"
            onClick={handleNewClick}
            startIcon={<Add />}
          >
            New
          </Button>

          <Button
            variant="outlined"
            onClick={handleSaveClick}
            disabled={!projectName}
            startIcon={<Save />}
          >
            Save
          </Button>

          <Button
            variant="outlined"
            onClick={handleOpenClick}
            startIcon={<FolderOpen />}
          >
            Open
          </Button>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: 'none', md: 'block' } }}
          />

          <FormControl
            size="small"
            sx={{ minWidth: { xs: '100%', md: 200 } }}
          >
            <InputLabel id="layout-mode-label">View Mode</InputLabel>
            <Select
              labelId="layout-mode-label"
              value={layoutMode}
              onChange={handleLayoutModeChange}
              label="View Mode"
            >
              <MenuItem value="tabbed">Tabbed</MenuItem>
              <MenuItem value="quad">Quad Layout</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Box>
  );
}
