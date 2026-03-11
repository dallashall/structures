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

import { ColorSwatch } from './ColorSwatch';
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
}: MaterialBrowserModalProps) {
  // Local state for grabbed material
  const [grabbedBlockId, setGrabbedBlockId] = React.useState<string | null>(null);
  // Track mouse position for floating grabbed material
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  // Reset grabbed material when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setGrabbedBlockId(null);
    }
  }, [isOpen]);

  // Track mouse movement to position floating grabbed material
  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    if (grabbedBlockId) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [grabbedBlockId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    onTabChange(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleMaterialClick = (blockId: string) => {
    // Click to grab the material
    setGrabbedBlockId(blockId);
  };

  const handleSlotClick = (index: number) => {
    // If we have a grabbed material, drop it into the slot
    if (grabbedBlockId) {
      onAssignSlot(index, grabbedBlockId);
      setGrabbedBlockId(null); // Clear after dropping
    }
  };

  const handleCancel = (event: React.MouseEvent) => {
    // Right-click to cancel
    if (event.button === 2) {
      event.preventDefault();
      setGrabbedBlockId(null);
    }
  };

  const matchesSearchQuery = (block: Block) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase());

  const filteredBlocks = blocks.filter(matchesSearchQuery);
  const currentCategoryBlocks = filteredBlocks.filter(CATEGORIES[selectedTab].filter);

  // Named handler creators for callbacks
  const createMaterialClickHandler = (blockId: string) => () => {
    handleMaterialClick(blockId);
  };

  const createSlotClickHandler = (index: number) => () => {
    handleSlotClick(index);
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
        <ColorSwatch color={block.color} size="L" />
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
        {block ? <ColorSwatch color={block.color} size="M" /> : (
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
          <IconButton onClick={onClose} size="small" aria-label="Close">
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
          sx={{
            position: 'fixed',
            left: mousePosition.x + 10,
            top: mousePosition.y + 10,
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
            transform: 'scale(1.1)',
          }}
        >
          <ColorSwatch color={grabbedBlock.color} size="L" />
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
