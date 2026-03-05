import { Box, Stack, Tab, Paper } from '@mui/material';
import { TabList, TabContext } from '@mui/lab';
import type { Project, Block, LayerState, ViewType, PaintMode, PaintBehavior, ShapeFillMode, DepthConfig } from '../types';
import { LayerControls } from '../components/LayerControls';
import { TabbedLayout } from '../layouts/TabbedLayout';
import { MetaBlockPlacementBanner } from '../components/MetaBlockPlacementBanner';
import { ToolPanel } from '../components/ToolPanel';
import { QuickSelectPalette } from '../components/QuickSelectPalette';
import { FullPaletteMenu } from '../components/FullPaletteMenu';
import { editorStateManager } from '../core/EditorStateManager';

interface TabbedEditorViewProps {
  project: Project;
  activeView: ViewType;
  activeLayers: LayerState;
  selectedBlock: string | null;
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  isPlacementMode: boolean;
  isActionBarExpanded: boolean;
  quickSelectSlots: (string | null)[];
  blocks: Block[];
  onLayerChange: (dimension: 'x' | 'y' | 'z', layer: number) => void;
  onViewChange: (view: ViewType) => void;
  onTabChange: (event: React.SyntheticEvent, newValue: string) => void;
  onPaintModeChange: (mode: PaintMode) => void;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  onQuickSelectSlot: (index: number) => void;
  onAssignSlot: (index: number) => void;
  onConfirmPlacement: () => void;
}

/**
 * TabbedEditorView - Tabbed layout mode for the editor
 *
 * Shows a single canvas with tabs to switch between views.
 * Includes layer controls, action bar, and meta block placement UI.
 */
export function TabbedEditorView({
  project,
  activeView,
  activeLayers,
  selectedBlock,
  paintMode,
  paintBehavior,
  shapeFillMode,
  depthConfig,
  isPlacementMode,
  isActionBarExpanded,
  quickSelectSlots,
  blocks,
  onLayerChange,
  onViewChange,
  onTabChange,
  onPaintModeChange,
  onPaintBehaviorChange,
  onShapeFillModeChange,
  onDepthConfigChange,
  onQuickSelectSlot,
  onAssignSlot,
  onConfirmPlacement,
}: TabbedEditorViewProps) {
  const selectedSlotIndex = quickSelectSlots.findIndex((id) => id === selectedBlock);

  return (
    <TabContext value={activeView}>
      {/* Layer Controls / Tab Bar */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {/* Tabs */}
          <Box sx={{ flex: 1 }}>
            <TabList onChange={onTabChange} aria-label="View tabs">
              <Tab label="Front" value="front" />
              <Tab label="Back" value="back" />
              <Tab label="Left" value="left" />
              <Tab label="Right" value="right" />
              <Tab label="Top" value="top" />
              <Tab label="Bottom" value="bottom" />
              <Tab label="3D Preview" value="3d" />
            </TabList>
          </Box>

          {/* Layer Controls */}
          <Box>
            <LayerControls
              maxDimensions={project.dimensions}
              activeLayers={activeLayers}
              onLayerChange={onLayerChange}
            />
          </Box>
        </Stack>
      </Box>

      {/* Canvas Layout */}
      <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', position: 'relative' }}>
        <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <TabbedLayout
            activeView={activeView}
            onViewChange={(key) => onViewChange(key as ViewType)}
            project={project}
            activeLayers={activeLayers}
            isPlacementMode={isPlacementMode}
            selectedBlockId={selectedBlock}
          />
        </Box>

        {/* Meta Block Placement Confirmation UI */}
        {isPlacementMode && (
          <MetaBlockPlacementBanner onConfirm={onConfirmPlacement} />
        )}

        {/* Right Sidebar - Dense Icon Tool Panel */}
        <Paper
          elevation={0}
          sx={{
            width: 100,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflowY: 'auto',
          }}
        >
          <ToolPanel
            paintMode={paintMode}
            onPaintModeChange={onPaintModeChange}
          />
        </Paper>
      </Box>
    </TabContext>
  );
}
