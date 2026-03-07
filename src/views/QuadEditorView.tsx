import { Box, Stack, Paper } from '@mui/material';
import type { Project, Block, LayerState, PaintMode, PaintBehavior, ShapeFillMode, DepthConfig } from '../types';
import { LayerControls } from '../components/LayerControls';
import { QuadLayout } from '../layouts/QuadLayout';
import { MetaBlockPlacementBanner } from '../components/MetaBlockPlacementBanner';
import { ToolPanel } from '../components/ToolPanel';

interface QuadEditorViewProps {
  project: Project;
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
  onPaintModeChange: (mode: PaintMode) => void;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  onQuickSelectSlot: (index: number) => void;
  onAssignSlot: (index: number) => void;
  onConfirmPlacement: () => void;
}

/**
 * QuadEditorView - Quad layout mode for the editor
 *
 * Shows four canvases simultaneously in a 2x2 grid.
 * Includes layer controls, action bar, and meta block placement UI.
 */
export function QuadEditorView({
  project,
  activeLayers,
  selectedBlock,
  paintMode,
  paintBehavior: _paintBehavior,
  shapeFillMode: _shapeFillMode,
  depthConfig: _depthConfig,
  isPlacementMode,
  isActionBarExpanded: _isActionBarExpanded,
  quickSelectSlots: _quickSelectSlots,
  blocks: _blocks,
  onLayerChange,
  onPaintModeChange,
  onPaintBehaviorChange: _onPaintBehaviorChange,
  onShapeFillModeChange: _onShapeFillModeChange,
  onDepthConfigChange: _onDepthConfigChange,
  onQuickSelectSlot: _onQuickSelectSlot,
  onAssignSlot: _onAssignSlot,
  onConfirmPlacement,
}: QuadEditorViewProps) {
  return (
    <>
      {/* Layer Controls / Tab Bar */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1 }}>
        <Stack direction="row" justifyContent="flex-end" alignItems="center">
          {/* Layer Controls */}
          <LayerControls
            maxDimensions={project.dimensions}
            activeLayers={activeLayers}
            onLayerChange={onLayerChange}
          />
        </Stack>
      </Box>

      {/* Canvas Layout */}
      <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', position: 'relative' }}>
        <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <QuadLayout
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
    </>
  );
}
