import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  TextField,
  IconButton,
  Button,
  Box,
  Stack,
  Typography,
  InputAdornment,
} from "@mui/material";
import { Apps, Search } from "@mui/icons-material";
import { DialogTrigger } from "./DialogTrigger";
import { BlockTextureSwatch } from "./BlockTextureSwatch";
import type { Block } from "../types";

interface FullPaletteMenuProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
}

/**
 * FullPaletteMenu - Popover menu with full block catalog
 *
 * Features:
 * - Triggered by button press (non-modal popover)
 * - Fuzzy search input at the top
 * - Blocks organized by category
 * - Responsive grid layout
 * - Click block to select and close menu
 *
 * Uses our custom DialogTrigger with type="popover" for non-blocking UI.
 */
export function FullPaletteMenu({
  blocks,
  selectedBlockId,
  onSelectBlock,
}: FullPaletteMenuProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  // Find the selected block
  const selectedBlock = selectedBlockId
    ? blocks.find((block) => block.id === selectedBlockId)
    : null;

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleBlockClick = (blockId: string, close: () => void) => {
    onSelectBlock(blockId);
    setSearchQuery(""); // Reset search
    close();
  };

  // Named filter function for search
  const matchesSearchQuery = (block: Block) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase());

  // Named map function for category extraction
  const toCategory = (block: Block) => block.category;

  // Filter blocks by search query
  const filteredBlocks = searchQuery.trim()
    ? blocks.filter(matchesSearchQuery)
    : blocks;

  // Group blocks by category
  const categories = Array.from(
    new Set(filteredBlocks.map(toCategory)),
  ).sort();

  const getBlocksByCategory = (category: string): Block[] => {
    return filteredBlocks.filter((block) => block.category === category);
  };

  // Named render function for individual blocks (extracted from map)
  const renderBlock = (block: Block, close: () => void) => {
    const handleClick = () => handleBlockClick(block.id, close);

    return (
      <Box
        key={block.id}
        onClick={handleClick}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          p: 1,
          borderRadius: 1,
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        <BlockTextureSwatch blockId={block.id} blockName={block.name} fallbackColor={block.color} />
        <Typography
          variant="caption"
          sx={{
            fontSize: 11,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            width: "100%",
          }}
        >
          {block.name}
        </Typography>
      </Box>
    );
  };

  return (
    <DialogTrigger type="popover">
      {selectedBlock ? (
        <IconButton aria-label={`Selected: ${selectedBlock.name}`}>
          <BlockTextureSwatch blockId={selectedBlock.id} blockName={selectedBlock.name} size="L" fallbackColor={selectedBlock.color} />
        </IconButton>
      ) : (
        <Button
          variant="outlined"
          startIcon={<Apps />}
          aria-label="Open block palette"
        >
          All Blocks
        </Button>
      )}
      {(close) => (
        <Dialog open onClose={close} maxWidth="md" fullWidth>
          <DialogTitle>Block Palette</DialogTitle>
          <Divider />
          <DialogContent>
            <Stack
              spacing={2}
              sx={{
                height: "70vh",
                minHeight: 400,
              }}
            >
              {/* Search */}
              <TextField
                placeholder="Search blocks"
                value={searchQuery}
                onChange={handleSearchChange}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Block Grid by Category */}
              <Box sx={{ overflow: "auto", flex: 1 }}>
                {categories.length === 0 ? (
                  <Typography variant="body2">No blocks found</Typography>
                ) : (
                  categories.map((category) => {
                    const categoryBlocks = getBlocksByCategory(category);

                    return (
                      <Box key={category} sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Typography>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "repeat(4, 1fr)",
                              sm: "repeat(6, 1fr)",
                              md: "repeat(8, 1fr)",
                            },
                            gap: 1,
                          }}
                        >
                          {categoryBlocks.map((block) => renderBlock(block, close))}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Stack>
          </DialogContent>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
