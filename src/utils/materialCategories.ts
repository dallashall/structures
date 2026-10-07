import type { Block } from '../types';

export interface MaterialCategory {
  label: string;
  includes: (block: Block) => boolean;
}

const nameIncludesAny = (block: Block, words: string[]): boolean => {
  const name = block.name.toLowerCase();
  const containsWord = (word: string): boolean => name.includes(word);
  return words.some(containsWord);
};

const isAnyBlock = (): boolean => true;
const isBuildingBlock = (block: Block): boolean => nameIncludesAny(block, ['stone', 'brick']);
const isNaturalBlock = (block: Block): boolean => nameIncludesAny(block, ['grass', 'dirt', 'wood']);
const isDecorationBlock = (block: Block): boolean => nameIncludesAny(block, ['wool', 'glass']);

// Name-based until BlockRegistry carries categories the browser can use
export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  { label: 'All', includes: isAnyBlock },
  { label: 'Building', includes: isBuildingBlock },
  { label: 'Natural', includes: isNaturalBlock },
  { label: 'Decoration', includes: isDecorationBlock },
];

/**
 * Blocks whose name contains the search query, within the category at categoryIndex
 */
export function filterMaterials(blocks: Block[], searchQuery: string, categoryIndex: number): Block[] {
  const query = searchQuery.toLowerCase();
  const category = MATERIAL_CATEGORIES[categoryIndex] ?? MATERIAL_CATEGORIES[0];
  const matches = (block: Block): boolean => block.name.toLowerCase().includes(query) && category.includes(block);
  return blocks.filter(matches);
}
