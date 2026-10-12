import type { Block } from '../types';

export const findBlockById = (
  blocks: Block[],
  blockId: string | null
): Block | null => {
  if (!blockId) return null;
  const hasId = (block: Block): boolean => block.id === blockId;
  return blocks.find(hasId) ?? null;
};
