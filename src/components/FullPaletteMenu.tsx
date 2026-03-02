import React from 'react';
import {
  DialogTrigger,
  Dialog,
  Heading,
  Divider,
  Content,
  SearchField,
  Grid,
  ActionButton,
  ColorSwatch,
  View,
  Flex,
  Text,
} from '@adobe/react-spectrum';
import Apps from '@spectrum-icons/workflow/Apps';
import type { Block } from '../types';

interface FullPaletteMenuProps {
  blocks: Block[];
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
 * Uses React Spectrum DialogTrigger with type="popover" for non-blocking UI.
 */
export function FullPaletteMenu({
  blocks,
  onSelectBlock,
}: FullPaletteMenuProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleBlockClick = (blockId: string, close: () => void) => {
    onSelectBlock(blockId);
    setSearchQuery(''); // Reset search
    close();
  };

  // Filter blocks by search query
  const filteredBlocks = searchQuery.trim()
    ? blocks.filter((block) =>
        block.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : blocks;

  // Group blocks by category
  const categories = Array.from(
    new Set(filteredBlocks.map((block) => block.category))
  ).sort();

  const getBlocksByCategory = (category: string): Block[] => {
    return filteredBlocks.filter((block) => block.category === category);
  };

  return (
    <DialogTrigger type="popover">
      <ActionButton aria-label="Open block palette">
        <Apps />
        <Text>All Blocks</Text>
      </ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Block Palette</Heading>
          <Divider />
          <Content>
            <Flex
              direction="column"
              gap="size-200"
              width={{ base: '90vw', M: 'size-6000' }}
              height={{ base: '80vh', M: 'size-6000' }}
              maxWidth="100%"
            >
              {/* Search */}
              <SearchField
                label="Search blocks"
                value={searchQuery}
                onChange={handleSearchChange}
                width="100%"
              />

              {/* Block Grid by Category */}
              <View overflow="auto" flex={1}>
                {categories.length === 0 ? (
                  <Text>No blocks found</Text>
                ) : (
                  categories.map((category) => {
                    const categoryBlocks = getBlocksByCategory(category);

                    const renderBlock = (block: Block) => {
                      const handleClick = () => handleBlockClick(block.id, close);

                      return (
                        <ActionButton key={block.id} onPress={handleClick} isQuiet>
                          <Flex direction="column" gap="size-50" alignItems="center">
                            <ColorSwatch color={block.color} />
                            <Text UNSAFE_style={{ fontSize: '11px', textAlign: 'center' }}>
                              {block.name}
                            </Text>
                          </Flex>
                        </ActionButton>
                      );
                    };

                    return (
                      <View key={category} marginBottom="size-300">
                        <Heading level={4} marginBottom="size-100">
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Heading>
                        <Grid
                          columns={{
                            base: 'repeat(auto-fill, minmax(60px, 1fr))',
                            M: 'repeat(auto-fill, minmax(80px, 1fr))',
                          }}
                          autoRows="auto"
                          gap="size-100"
                        >
                          {categoryBlocks.map(renderBlock)}
                        </Grid>
                      </View>
                    );
                  })
                )}
              </View>
            </Flex>
          </Content>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
