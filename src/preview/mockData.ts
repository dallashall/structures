import type { Block, Project, ViewType, LayoutMode } from '../types';
import { BlockIndex } from '../core/BlockIndex';

/**
 * Mock Minecraft blocks for component testing
 * Colors are representative hex values for 2D rendering
 */
export const mockBlocks: Block[] = [
  // Stone & Rock
  { id: 'stone', name: 'Stone', category: 'stone', color: '#7D7D7D', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'cobblestone', name: 'Cobblestone', category: 'stone', color: '#7A7A7A', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'stone_bricks', name: 'Stone Bricks', category: 'stone', color: '#787878', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'granite', name: 'Granite', category: 'stone', color: '#9B6A59', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'diorite', name: 'Diorite', category: 'stone', color: '#C5C5C5', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'andesite', name: 'Andesite', category: 'stone', color: '#8B8B8B', hasBlockState: false, isCube: true, isTransparent: false },

  // Nature & Organic
  { id: 'grass', name: 'Grass Block', category: 'nature', color: '#5FAF3C', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'dirt', name: 'Dirt', category: 'nature', color: '#8B6E49', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'sand', name: 'Sand', category: 'nature', color: '#DBD3A0', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'gravel', name: 'Gravel', category: 'nature', color: '#827E7E', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'clay', name: 'Clay', category: 'nature', color: '#A0A7B5', hasBlockState: false, isCube: true, isTransparent: false },

  // Wood
  { id: 'oak_log', name: 'Oak Log', category: 'wood', color: '#9B7653', hasBlockState: true, isCube: true, isTransparent: false },
  { id: 'oak_planks', name: 'Oak Planks', category: 'wood', color: '#B8945F', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'spruce_log', name: 'Spruce Log', category: 'wood', color: '#3D2912', hasBlockState: true, isCube: true, isTransparent: false },
  { id: 'spruce_planks', name: 'Spruce Planks', category: 'wood', color: '#7A5C3C', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'birch_log', name: 'Birch Log', category: 'wood', color: '#D7D3CA', hasBlockState: true, isCube: true, isTransparent: false },
  { id: 'birch_planks', name: 'Birch Planks', category: 'wood', color: '#D7CB8D', hasBlockState: false, isCube: true, isTransparent: false },

  // Decoration & Building
  { id: 'glass', name: 'Glass', category: 'decoration', color: '#C0F0F0', hasBlockState: false, isCube: true, isTransparent: true },
  { id: 'glass_pane', name: 'Glass Pane', category: 'decoration', color: '#C0F0F0', hasBlockState: false, isCube: false, isTransparent: true },
  { id: 'bricks', name: 'Bricks', category: 'decoration', color: '#965A54', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'wool_white', name: 'White Wool', category: 'decoration', color: '#FFFFFF', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'wool_red', name: 'Red Wool', category: 'decoration', color: '#A12722', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'wool_blue', name: 'Blue Wool', category: 'decoration', color: '#35399D', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'wool_green', name: 'Green Wool', category: 'decoration', color: '#546D1B', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'wool_yellow', name: 'Yellow Wool', category: 'decoration', color: '#F8C627', hasBlockState: false, isCube: true, isTransparent: false },

  // Ores & Minerals
  { id: 'coal_ore', name: 'Coal Ore', category: 'ore', color: '#767676', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'iron_ore', name: 'Iron Ore', category: 'ore', color: '#B89782', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'gold_ore', name: 'Gold Ore', category: 'ore', color: '#FCEE4B', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'diamond_ore', name: 'Diamond Ore', category: 'ore', color: '#5DECF5', hasBlockState: false, isCube: true, isTransparent: false },

  // Metal Blocks
  { id: 'iron_block', name: 'Iron Block', category: 'metal', color: '#E8E8E8', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'gold_block', name: 'Gold Block', category: 'metal', color: '#FCEE4B', hasBlockState: false, isCube: true, isTransparent: false },
  { id: 'diamond_block', name: 'Diamond Block', category: 'metal', color: '#5DECF5', hasBlockState: false, isCube: true, isTransparent: false },
];

/**
 * Mock callback handlers that log to console for testing
 */
export const mockCallbacks = {
  onSelectBlock: (blockId: string): void => {
    console.log('[Mock Callback] Block selected:', blockId);
  },

  onViewChange: (view: ViewType): void => {
    console.log('[Mock Callback] View changed:', view);
  },

  onLayerChange: (layer: number): void => {
    console.log('[Mock Callback] Layer changed:', layer);
  },

  onLayoutModeChange: (mode: LayoutMode): void => {
    console.log('[Mock Callback] Layout mode changed:', mode);
  },

  onNewProject: (): void => {
    console.log('[Mock Callback] New project clicked');
  },

  onSaveProject: (): void => {
    console.log('[Mock Callback] Save project clicked');
  },

  onOpenProject: (): void => {
    console.log('[Mock Callback] Open project clicked');
  },

  onToggle3D: (): void => {
    console.log('[Mock Callback] Toggle 3D clicked');
  },

  onExport: (): void => {
    console.log('[Mock Callback] Export clicked');
  },

  onSettings: (): void => {
    console.log('[Mock Callback] Settings clicked');
  },
};

/**
 * Mock project data for component testing
 */
export const mockProject: Project = {
  id: 'preview-project-001',
  name: 'Sample House',
  dimensions: { width: 10, height: 8, depth: 10 },
  metaBlock: {
    position: { x: 5, y: 0, z: 5 },
    direction: 'north',
    isConfirmed: true,
  },
  blocks: new BlockIndex(),
  created: new Date('2026-03-01T10:00:00Z'),
  modified: new Date('2026-03-01T14:30:00Z'),
};

/**
 * Helper to get blocks by category
 */
export const getBlocksByCategory = (category: string): Block[] => {
  return mockBlocks.filter((block) => block.category === category);
};

/**
 * Helper to get a specific mock block by ID
 */
export const getMockBlock = (id: string): Block | undefined => {
  return mockBlocks.find((block) => block.id === id);
};
