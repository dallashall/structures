import { Box, Stack, Tab, Paper, Divider } from '@mui/material';
import { TabList, TabContext } from '@mui/lab';
import type { Project, Block, LayerState, ViewType, PaintMode, PaintBehavior, ShapeFillMode, DepthConfig } from '../types';
import { TabbedLayout } from '../layouts/TabbedLayout';
import { MetaBlockPlacementBanner } from '../components/MetaBlockPlacementBanner';
import { ToolPanel } from '../components/ToolPanel';
import { ForegroundBackgroundSelector } from '../components/ForegroundBackgroundSelector';
import { QuickSelectPalette } from '../components/QuickSelectPalette';
import { editorState } from '../core/EditorState';

interface TabbedEditorViewProps {
  project: Project;
  activeView: ViewType;
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
  onViewChange,
  onTabChange,
  onPaintModeChange,
  onPaintBehaviorChange: _onPaintBehaviorChange,
  onShapeFillModeChange: _onShapeFillModeChange,
  onDepthConfigChange: _onDepthConfigChange,
  onQuickSelectSlot,
  onAssignSlot,
  onConfirmPlacement,
}: TabbedEditorViewProps) {
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
    <TabContext value={activeView}>
      {/* Tab Bar */}
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
    </TabContext>
  );
}
