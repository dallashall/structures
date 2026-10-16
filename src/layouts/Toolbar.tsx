import {
  Box,
  Stack,
  Button,
  Typography,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { InfoOutlined, IosShare, Save, ViewList } from '@mui/icons-material';
import type { LayoutMode } from '../types';
import type { SaveState } from '../core/SaveTracker';
import { SaveStatusIndicator } from '../components/SaveStatusIndicator';
import { UndoRedoButtons } from '../components/UndoRedoButtons';
import { ThemeChoiceMenu } from '../components/ThemeChoiceMenu';

interface ToolbarProps {
  projectName: string | null;
  layoutMode: LayoutMode;
  saveState: SaveState;
  onBackToProjects: () => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
  // Absent in previews, which hide the Save, Export, and Credits buttons
  onSaveToFile?: () => void;
  onExport?: () => void;
  onShowCredits?: () => void;
}

export function Toolbar({
  projectName,
  layoutMode,
  saveState,
  onBackToProjects,
  onLayoutModeChange,
  onSaveToFile,
  onExport,
  onShowCredits,
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

        {projectName && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <SaveStatusIndicator saveState={saveState} />
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <UndoRedoButtons />
          </>
        )}

        <Box sx={{ flex: 1 }} />

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
        >
          {projectName && onSaveToFile && (
            <Button variant="outlined" onClick={onSaveToFile} startIcon={<Save />}>
              Save
            </Button>
          )}

          {projectName && onExport && (
            <Button variant="outlined" onClick={onExport} startIcon={<IosShare />}>
              Export
            </Button>
          )}

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

          <ThemeChoiceMenu />

          {onShowCredits && (
            <IconButton onClick={onShowCredits} aria-label="Credits">
              <InfoOutlined />
            </IconButton>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
