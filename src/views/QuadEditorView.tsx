import { Box, Stack, Paper, Divider } from '@mui/material';
import type { Project, Block, LayerState, PaintMode, PaintBehavior, ShapeFillMode, DepthConfig } from '../types';
import { QuadLayout } from '../layouts/QuadLayout';
import { MetaBlockPlacementBanner } from '../components/MetaBlockPlacementBanner';
import { ToolPanel } from '../components/ToolPanel';
import { ForegroundBackgroundSelector } from '../components/ForegroundBackgroundSelector';
import { QuickSelectPalette } from '../components/QuickSelectPalette';
import { editorState } from '../core/EditorState';

interface QuadEditorViewProps {
  project: Project;
  activeLayers: LayerState;
  selectedBlock: string | null;
  foregroundBlock: string | null;
  backgroundBlock: string | null;
  activeMaterialSlot: 'foreground' | 'background';
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  isPlacementMode: boolean;
  isActionBarExpanded: boolean;
  quickSelectSlots: (string | null)[];
  blocks: Block[];
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
  foregroundBlock,
  backgroundBlock,
  activeMaterialSlot,
  paintMode,
  paintBehavior: _paintBehavior,
  shapeFillMode: _shapeFillMode,
  depthConfig: _depthConfig,
  isPlacementMode,
  isActionBarExpanded: _isActionBarExpanded,
  quickSelectSlots,
  blocks,
  onPaintModeChange,
  onPaintBehaviorChange: _onPaintBehaviorChange,
  onShapeFillModeChange: _onShapeFillModeChange,
  onDepthConfigChange: _onDepthConfigChange,
  onQuickSelectSlot,
  onAssignSlot,
  onConfirmPlacement,
}: QuadEditorViewProps) {
  // Handlers for foreground/background selector
  const handleToggleSlot = () => {
    editorState.toggleMaterialSlot();
  };

  const handleClickForeground = () => {
    editorState.setActiveMaterialSlot('foreground');
  };

  const handleClickBackground = () => {
    editorState.setActiveMaterialSlot('background');
  };
  return (
    <>
      {/* Canvas Layout */}
      <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', position: 'relative' }}>
        <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <QuadLayout
            project={project}
            activeLayers={activeLayers}
            selectedBlockId={selectedBlock}
          />
        </Box>

        {/* Meta Block Placement Confirmation UI */}
        {isPlacementMode && (
          <MetaBlockPlacementBanner onConfirm={onConfirmPlacement} />
        )}

        {/* Right Sidebar - Tool Panel + Material Selector */}
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
          <Stack direction="column" spacing={1.5} sx={{ p: 0.5 }}>
            <ToolPanel
              paintMode={paintMode}
              onPaintModeChange={onPaintModeChange}
            />
            <Divider />
            <QuickSelectPalette
              slots={quickSelectSlots}
              blocks={blocks}
              onSelectSlot={onQuickSelectSlot}
              onAssignSlot={onAssignSlot}
              onOpenBrowser={() => editorState.setMaterialBrowserOpen(true)}
              orientation="vertical"
            />
            <Divider />
            <Box sx={{ pt: 2 }}>
              <ForegroundBackgroundSelector
                foregroundBlockId={foregroundBlock}
                backgroundBlockId={backgroundBlock}
                activeMaterialSlot={activeMaterialSlot}
                blocks={blocks}
                onToggleSlot={handleToggleSlot}
                onClickForeground={handleClickForeground}
                onClickBackground={handleClickBackground}
              />
            </Box>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
