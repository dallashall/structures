import { Box, Stack, Paper, Divider } from '@mui/material';
import type { Block, LayerState, PaintMode, PaintBehavior, ShapeFillMode, DepthConfig, BlockStateProperties } from '../types';
import { QuadLayout } from '../layouts/QuadLayout';
import { ToolPanel } from '../components/ToolPanel';
import { BlockStateControls } from '../components/BlockStateControls';
import { ForegroundBackgroundSelector } from '../components/ForegroundBackgroundSelector';
import { QuickSelectPalette } from '../components/QuickSelectPalette';
import { editorState } from '../core/EditorState';

interface QuadEditorViewProps {
  activeLayers: LayerState;
  foregroundBlock: string | null;
  backgroundBlock: string | null;
  activeMaterialSlot: 'foreground' | 'background';
  activeBlockState: BlockStateProperties;
  hasBlockState: boolean;
  paintMode: PaintMode;
  paintBehavior: PaintBehavior;
  shapeFillMode: ShapeFillMode;
  depthConfig: DepthConfig;
  quickSelectSlots: (string | null)[];
  blocks: Block[];
  onPaintModeChange: (mode: PaintMode) => void;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  onQuickSelectSlot: (index: number) => void;
  onAssignSlot: (index: number) => void;
}

export function QuadEditorView({
  activeLayers,
  foregroundBlock,
  backgroundBlock,
  activeMaterialSlot,
  activeBlockState,
  hasBlockState,
  paintMode,
  paintBehavior: _paintBehavior,
  shapeFillMode: _shapeFillMode,
  depthConfig: _depthConfig,
  quickSelectSlots,
  blocks,
  onPaintModeChange,
  onPaintBehaviorChange: _onPaintBehaviorChange,
  onShapeFillModeChange: _onShapeFillModeChange,
  onDepthConfigChange: _onDepthConfigChange,
  onQuickSelectSlot,
  onAssignSlot,
}: QuadEditorViewProps) {
  const handleOpenMaterialBrowser = () => {
    editorState.setMaterialBrowserOpen(true);
  };

  const handleToggleSlot = () => {
    editorState.toggleMaterialSlot();
  };

  const handleClickForeground = () => {
    editorState.setActiveMaterialSlot('foreground');
  };

  const handleClickBackground = () => {
    editorState.setActiveMaterialSlot('background');
  };

  const handleSetBlockState = (state: BlockStateProperties) => editorState.setActiveBlockState(state);

  return (
    <>
      <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', position: 'relative' }}>
        <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <QuadLayout
            activeLayers={activeLayers}
          />
        </Box>


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
            {hasBlockState && (
              <>
                <Divider />
                <BlockStateControls
                  activeBlockState={activeBlockState}
                  hasBlockState={hasBlockState}
                  onSetBlockState={handleSetBlockState}
                />
              </>
            )}
            <Divider />
            <QuickSelectPalette
              slots={quickSelectSlots}
              blocks={blocks}
              onSelectSlot={onQuickSelectSlot}
              onAssignSlot={onAssignSlot}
              onOpenBrowser={handleOpenMaterialBrowser}
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
