import { Box, Paper, Stack, IconButton } from '@mui/material';
import { Apps } from '@mui/icons-material';
import type { Block, PaintMode } from '../types';
import { ToolPanel } from './ToolPanel';
import { QuickSelectPalette } from './QuickSelectPalette';
import { FullPaletteMenu } from './FullPaletteMenu';
import { editorState } from '../core/EditorState';

interface ActionBarPanelProps {
  paintMode: PaintMode;
  quickSelectSlots: (string | null)[];
  selectedSlotIndex: number;
  selectedBlock: string | null;
  blocks: Block[];
  onPaintModeChange: (mode: PaintMode) => void;
  onSelectSlot: (index: number) => void;
  onAssignSlot: (index: number) => void;
  onCollapse: () => void;
}

/**
 * ActionBarPanel - Collapsible sidebar with tool panel and material palette
 *
 * Contains:
 * - Tool panel (icon-based paint mode selector)
 * - Quick-select palette (5 slots)
 * - Full material palette menu
 * - Collapse button
 */
export function ActionBarPanel({
  paintMode,
  quickSelectSlots,
  selectedSlotIndex,
  selectedBlock,
  blocks,
  onPaintModeChange,
  onSelectSlot,
  onAssignSlot,
  onCollapse,
}: ActionBarPanelProps) {
  return (
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
      }}
    >
      <Stack direction="column" spacing={2} sx={{ p: 1, flex: 1, overflowY: 'auto' }}>
        <ToolPanel
          paintMode={paintMode}
          onPaintModeChange={onPaintModeChange}
        />
        <QuickSelectPalette
          slots={quickSelectSlots}
          selectedSlotIndex={selectedSlotIndex}
          blocks={blocks}
          onSelectSlot={onSelectSlot}
          onAssignSlot={onAssignSlot}
          orientation="vertical"
        />
        <FullPaletteMenu
          blocks={blocks}
          selectedBlockId={selectedBlock}
          onSelectBlock={(blockId: string) => editorState.setSelectedBlock(blockId)}
        />
      </Stack>
      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1, display: 'flex', justifyContent: 'center' }}>
        <IconButton
          onClick={onCollapse}
          size="small"
          aria-label="Hide palette"
        >
          <Apps />
        </IconButton>
      </Box>
    </Paper>
  );
}
