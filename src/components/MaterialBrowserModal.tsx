import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Box,
  Tabs,
  Tab,
  Typography,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Search, Close, PanTool } from '@mui/icons-material';

import type { Block } from '../types';

import { pointerFollower } from '../core/PointerFollower';

import { BlockTextureSwatch } from './BlockTextureSwatch';
import { findBlockById } from '../utils/blockUtils';

interface MaterialBrowserModalProps {
  isOpen: boolean;
  blocks: Block[];
  onClose: () => void;
  searchQuery: string;
  selectedTab: number;
  onSearchChange: (query: string) => void;
  onTabChange: (tab: number) => void;
  quickSelectSlots: (string | null)[];
  onAssignSlot: (index: number, blockId: string) => void;
  grabbedBlockId: string | null;
  onGrabBlock: (blockId: string | null) => void;
}

// Category definitions (could be moved to BlockRegistry in the future)
const CATEGORIES = [
  { label: 'All', filter: () => true },
  { label: 'Building', filter: (b: Block) => b.name.toLowerCase().includes('stone') || b.name.toLowerCase().includes('brick') },
  { label: 'Natural', filter: (b: Block) => b.name.toLowerCase().includes('grass') || b.name.toLowerCase().includes('dirt') || b.name.toLowerCase().includes('wood') },
  { label: 'Decoration', filter: (b: Block) => b.name.toLowerCase().includes('wool') || b.name.toLowerCase().includes('glass') },
];

/**
 * MaterialBrowserModal - Full material browser with grab-and-drop interaction
 *
 * Minecraft-style material browser with:
 * - Click to grab a material
 * - Click slot to drop grabbed material
 * - Right-click to cancel/clear grabbed material
 * - Tabs for material categories
 * - Search functionality
 *
 * The grabbed block lives in EditorState, so closing the browser releases it.
 */
export function MaterialBrowserModal({
  isOpen,
  blocks,
  onClose,
  searchQuery,
  selectedTab,
  onSearchChange,
  onTabChange,
  quickSelectSlots,
  onAssignSlot,
  grabbedBlockId,
  onGrabBlock,
}: MaterialBrowserModalProps) {
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    event.stopPropagation(); // Prevent clearing grabbed material when changing tabs
    onTabChange(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleMaterialClick = (blockId: string, event: React.MouseEvent) => {
    // Click to grab the material
    event.stopPropagation(); // Prevent clearing grabbed material
    onGrabBlock(blockId);
  };

  const handleSlotClick = (index: number, event: React.MouseEvent) => {
    // If we have a grabbed material, drop it into the slot
    event.stopPropagation(); // Prevent clearing grabbed material
    if (grabbedBlockId) {
      onAssignSlot(index, grabbedBlockId);
      onGrabBlock(null); // Clear after dropping
    }
  };

  const handleClearGrabbedMaterial = () => {
    // Click on empty space clears the grabbed material
    if (grabbedBlockId) {
      onGrabBlock(null);
    }
  };

  const handleCancel = (event: React.MouseEvent) => {
    // Right-click to cancel
    if (event.button === 2) {
      event.preventDefault();
      onGrabBlock(null);
    }
  };

  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent clearing grabbed material when closing
    onClose();
  };

  const matchesSearchQuery = (block: Block) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase());

  const filteredBlocks = blocks.filter(matchesSearchQuery);
  const currentCategoryBlocks = filteredBlocks.filter(CATEGORIES[selectedTab].filter);

  // Named handler creators for callbacks
  const createMaterialClickHandler = (blockId: string) => (event: React.MouseEvent) => {
    handleMaterialClick(blockId, event);
  };

  const createSlotClickHandler = (index: number) => (event: React.MouseEvent) => {
    handleSlotClick(index, event);
  };

  const renderTab = (category: typeof CATEGORIES[0], index: number) => (
    <Tab key={index} label={category.label} />
  );

  const renderMaterialBlock = (block: Block) => {
    const isGrabbed = block.id === grabbedBlockId;

    return (
      <Box
        key={block.id}
        onClick={createMaterialClickHandler(block.id)}
        sx={{
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 0.5,
          borderRadius: 1,
          border: 2,
          borderColor: isGrabbed ? 'primary.main' : 'transparent',
          bgcolor: isGrabbed ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: isGrabbed ? 'action.selected' : 'action.hover',
          },
          transition: 'all 0.1s',
        }}
      >
        <BlockTextureSwatch blockId={block.id} blockName={block.name} size="L" fallbackColor={block.color} />
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            mt: 0.25,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {block.name}
        </Typography>
      </Box>
    );
  };

  const renderQuickSelectSlot = (blockId: string | null, index: number) => {
    const block = findBlockById(blocks, blockId);

    return (
      <Box
        key={index}
        onClick={createSlotClickHandler(index)}
        onContextMenu={handleCancel}
        sx={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 2,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          cursor: grabbedBlockId ? 'pointer' : 'default',
          '&:hover': {
            borderColor: grabbedBlockId ? 'primary.main' : 'divider',
            bgcolor: grabbedBlockId ? 'action.hover' : 'background.paper',
          },
          transition: 'all 0.1s',
        }}
      >
        {block ? <BlockTextureSwatch blockId={block.id} blockName={block.name} size="M" fallbackColor={block.color} /> : (
          <Typography variant="caption" color="text.disabled">
            {index + 1}
          </Typography>
        )}
      </Box>
    );
  };

  const grabbedBlock = findBlockById(blocks, grabbedBlockId);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        onClick={handleClearGrabbedMaterial}
        onContextMenu={handleCancel}
        slotProps={{
          paper: {
            sx: {
              height: '80vh',
              maxHeight: 600,
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, pr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Material Browser
            {grabbedBlock && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                }}
              >
                <PanTool fontSize="small" />
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  {grabbedBlock.name}
                </Typography>
              </Box>
            )}
          </Box>
          <IconButton onClick={handleClose} size="small" aria-label="Close">
            <Close />
          </IconButton>
        </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search Bar */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <TextField
            fullWidth
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

        {/* Category Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={selectedTab} onChange={handleTabChange}>
            {CATEGORIES.map(renderTab)}
          </Tabs>
        </Box>

        {/* Materials Grid */}
        <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }} onContextMenu={handleCancel}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
              gap: 1,
            }}
          >
            {currentCategoryBlocks.map(renderMaterialBlock)}
          </Box>

          {currentCategoryBlocks.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No materials found
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

        {/* Quick Select Slots - Fixed at bottom */}
        <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 'bold', fontSize: '0.7rem' }}>
            {grabbedBlock ? 'Click a slot to drop material' : 'Quick Select (1-9)'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            {quickSelectSlots.map(renderQuickSelectSlot)}
          </Box>
        </Box>
      </Dialog>

      {/* Floating Grabbed Material - Follows cursor */}
      {grabbedBlock && (
        <Box
          ref={pointerFollower.mountFollower}
          sx={{
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 2000,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'background.paper',
            border: 2,
            borderColor: 'primary.main',
            borderRadius: 1,
            boxShadow: 6,
            p: 0.5,
            willChange: 'transform',
          }}
        >
          <BlockTextureSwatch blockId={grabbedBlock.id} blockName={grabbedBlock.name} size="L" fallbackColor={grabbedBlock.color} />
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              mt: 0.25,
              textAlign: 'center',
              maxWidth: 80,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {grabbedBlock.name}
          </Typography>
        </Box>
      )}
    </>
  );
}
