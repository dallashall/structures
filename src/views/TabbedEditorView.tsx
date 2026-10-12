import { Box, Stack, Tab, Paper, Divider } from '@mui/material';
import { TabList, TabContext } from '@mui/lab';
import type { Block, LayerState, ViewType, PaintMode, PaintBehavior, ShapeFillMode, DepthConfig, BlockStateProperties } from '../types';
import { TabbedLayout } from '../layouts/TabbedLayout';
import { ToolPanel } from '../components/ToolPanel';
import { BlockStateControls } from '../components/BlockStateControls';
import { ForegroundBackgroundSelector } from '../components/ForegroundBackgroundSelector';
import { QuickSelectPalette } from '../components/QuickSelectPalette';
import { editorState } from '../core/EditorState';

interface TabbedEditorViewProps {
  activeView: ViewType;
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
  onViewChange: (view: ViewType) => void;
  onTabChange: (event: React.SyntheticEvent, newValue: string) => void;
  onPaintModeChange: (mode: PaintMode) => void;
  onPaintBehaviorChange: (behavior: PaintBehavior) => void;
  onShapeFillModeChange: (mode: ShapeFillMode) => void;
  onDepthConfigChange: (config: Partial<DepthConfig>) => void;
  onQuickSelectSlot: (index: number) => void;
  onAssignSlot: (index: number) => void;
}

export function TabbedEditorView({
  activeView,
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
  onViewChange,
  onTabChange,
  onPaintModeChange,
  onPaintBehaviorChange: _onPaintBehaviorChange,
  onShapeFillModeChange: _onShapeFillModeChange,
  onDepthConfigChange: _onDepthConfigChange,
  onQuickSelectSlot,
  onAssignSlot,
}: TabbedEditorViewProps) {
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

  const handleViewChange = (key: React.Key) => onViewChange(key as ViewType);

  return (
    <TabContext value={activeView}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1 }}>
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

      <Box sx={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', position: 'relative' }}>
        <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <TabbedLayout
            activeView={activeView}
            onViewChange={handleViewChange}
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
    </TabContext>
  );
}
