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
import { Search, Close } from '@mui/icons-material';
import type { Block } from '../types';
import { DraggableMaterialBlock } from './DraggableMaterialBlock';
import { DroppableQuickSelectSlot } from './DroppableQuickSelectSlot';

interface MaterialBrowserModalProps {
  isOpen: boolean;
  blocks: Block[];
  onClose: () => void;
  onSelectMaterial: (blockId: string) => void;
  selectedBlockId: string | null;
  searchQuery: string;
  selectedTab: number;
  onSearchChange: (query: string) => void;
  onTabChange: (tab: number) => void;
  quickSelectSlots: (string | null)[];
  selectedSlotIndex: number;
  onSelectSlot: (index: number) => void;
}

// Category definitions (could be moved to BlockRegistry in the future)
const CATEGORIES = [
  { label: 'All', filter: () => true },
  { label: 'Building', filter: (b: Block) => b.name.toLowerCase().includes('stone') || b.name.toLowerCase().includes('brick') },
  { label: 'Natural', filter: (b: Block) => b.name.toLowerCase().includes('grass') || b.name.toLowerCase().includes('dirt') || b.name.toLowerCase().includes('wood') },
  { label: 'Decoration', filter: (b: Block) => b.name.toLowerCase().includes('wool') || b.name.toLowerCase().includes('glass') },
];

/**
 * MaterialBrowserModal - Full material browser with tabs and search
 *
 * Minecraft-style material browser with:
 * - Tabs for material categories
 * - Search functionality
 * - Grid display of all materials
 */
export function MaterialBrowserModal({
  isOpen,
  blocks,
  onClose,
  onSelectMaterial,
  selectedBlockId,
  searchQuery,
  selectedTab,
  onSearchChange,
  onTabChange,
  quickSelectSlots,
  selectedSlotIndex,
  onSelectSlot,
}: MaterialBrowserModalProps) {
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    onTabChange(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleMaterialClick = (blockId: string) => {
    onSelectMaterial(blockId);
  };

  const handleSlotClick = (index: number) => {
    onSelectSlot(index);
  };

  const matchesBlockId = (blockId: string | null) => (b: Block) => b.id === blockId;

  const getBlockById = (blockId: string | null): Block | null => {
    if (!blockId) return null;
    return blocks.find(matchesBlockId(blockId)) ?? null;
  };

  const matchesSearchQuery = (block: Block) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase());

  const filteredBlocks = blocks.filter(matchesSearchQuery);
  const currentCategoryBlocks = filteredBlocks.filter(CATEGORIES[selectedTab].filter);

  const renderTab = (category: typeof CATEGORIES[0], index: number) => (
    <Tab key={index} label={category.label} />
  );

  const renderMaterialBlock = (block: Block) => {
    const isSelected = block.id === selectedBlockId;

    return (
      <DraggableMaterialBlock
        key={block.id}
        block={block}
        isSelected={isSelected}
        onClick={handleMaterialClick}
      />
    );
  };

  const renderQuickSelectSlot = (blockId: string | null, index: number) => {
    const block = getBlockById(blockId);
    const isSelected = index === selectedSlotIndex;

    return (
      <DroppableQuickSelectSlot
        key={index}
        index={index}
        isSelected={isSelected}
        block={block}
        onClick={handleSlotClick}
      />
    );
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
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
        <Typography variant="h6">Material Browser</Typography>
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
        <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
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
          Quick Select (1-9)
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {quickSelectSlots.map(renderQuickSelectSlot)}
        </Box>
      </Box>
    </Dialog>
  );
}
