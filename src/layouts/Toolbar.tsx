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
import { ViewList } from '@mui/icons-material';
import type { LayoutMode } from '../types';
import type { SaveState } from '../core/Storage';
import { SaveStatusIndicator } from '../components/SaveStatusIndicator';

interface ToolbarProps {
  projectName: string | null;
  layoutMode: LayoutMode;
  saveState: SaveState;
  onBackToProjects: () => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
  // Optional props for preview compatibility (3D feature not yet implemented)
  onToggle3D?: () => void;
  is3DMode?: boolean;
}

/**
 * Toolbar - Application header with primary actions
 *
 * Displays:
 * - Project name (left)
 * - Save status indicator (center, between name and controls)
 * - Projects button (right)
 * - View mode selector (right)
 *
 * Uses MUI components for consistent theming and
 * automatic light/dark mode support.
 */
export function Toolbar({
  projectName,
  layoutMode,
  saveState,
  onBackToProjects,
  onLayoutModeChange,
}: ToolbarProps) {
  const handleProjectsClick = () => {
    onBackToProjects();
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
        direction="row"
        alignItems="center"
        spacing={2}
      >
        <Box
          component="img"
          src="/logo-256.png"
          alt=""
          sx={{ width: 32, height: 32 }}
        />

        {/* Project Name */}
        <Typography
          variant="h5"
          component="h1"
          sx={{
            m: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {projectName || 'Structures'}
        </Typography>

        {/* Save Status Indicator - next to title with divider */}
        {projectName && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <SaveStatusIndicator saveState={saveState} />
          </>
        )}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Right Controls */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
        >
          <Button
            variant="outlined"
            onClick={handleProjectsClick}
            startIcon={<ViewList />}
          >
            Projects
          </Button>

          <Divider
            orientation="vertical"
            flexItem
          />

          <FormControl
            size="small"
            sx={{ minWidth: 200 }}
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
