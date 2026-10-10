import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Box,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Search, Close } from '@mui/icons-material';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

import type { Block } from '../types';

import { SHORTCUTS } from '../core/Shortcuts';

import { withMaterialBrowserState } from '../hocs/withMaterialBrowserState';
import type { WithMaterialBrowserStateProps } from '../hocs/withMaterialBrowserState';

import { MaterialGrid } from './MaterialGrid';
import { MaterialDragOverlay } from './MaterialDragOverlay';
import { QuickSelectDropBar } from './QuickSelectDropBar';

import { MATERIAL_CATEGORIES } from '../utils/materialCategories';
import type { MaterialCategory } from '../utils/materialCategories';

// A press must travel this far before it becomes a drag, so a plain click still picks
const DRAG_ACTIVATION_PX = 4;

interface MaterialBrowserModalProps {
  // Every block, hidden ones included, so slots show whatever they hold
  blocks: Block[];
  quickSelectSlots: (string | null)[];
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onTabChange: (tab: number) => void;
  onAssignSlot: (index: number, blockId: string) => void;
  onPick: (blockId: string) => void;
}

const renderTab = (category: MaterialCategory, index: number) => <Tab key={index} label={category.label} />;

/**
 * MaterialBrowserModal - Searchable, windowed material browser
 *
 * Drag a material onto a quick-select slot to assign it. Click a material to put it in the active slot.
 */
function MaterialBrowserModalComponent({
  blocks,
  quickSelectSlots,
  onClose,
  onSearchChange,
  onTabChange,
  onAssignSlot,
  onPick,
  isOpen,
  searchQuery,
  selectedTab,
  results,
  isStale,
  gridWidth,
  onGridResize,
}: MaterialBrowserModalProps & WithMaterialBrowserStateProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_PX } }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => onTabChange(newValue);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => onSearchChange(event.target.value);

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    const blockId = (active.data.current as { blockId?: string } | undefined)?.blockId;
    const slotIndex = (over?.data.current as { slotIndex?: number } | undefined)?.slotIndex;
    if (blockId && slotIndex !== undefined) onAssignSlot(slotIndex, blockId);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { height: '80vh', maxHeight: 640 } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, pr: 2 }}>
        Material Browser ({SHORTCUTS.materialBrowser})
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <Close />
        </IconButton>
      </DialogTitle>

      {/* No auto-scroll: every drag to the slot bar crosses the grid's bottom edge, which would scroll it */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} autoScroll={false}>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <TextField
              fullWidth
              autoFocus
              size="small"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={handleSearchChange}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs value={selectedTab} onChange={handleTabChange}>
              {MATERIAL_CATEGORIES.map(renderTab)}
            </Tabs>
          </Box>

          <Box sx={{ px: 1.5, py: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <MaterialGrid blocks={results} width={gridWidth} isStale={isStale} onResize={onGridResize} onPick={onPick} />
          </Box>
        </DialogContent>

        <QuickSelectDropBar slots={quickSelectSlots} blocks={blocks} />
        <MaterialDragOverlay blocks={blocks} />
      </DndContext>
    </Dialog>
  );
}

export const MaterialBrowserModal = withMaterialBrowserState<MaterialBrowserModalProps>(MaterialBrowserModalComponent);
