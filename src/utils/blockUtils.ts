import type { Block } from '../types';

/**
 * Find a block by ID from a block array
 *
 * Pure utility function for block lookup operations.
 * Moved from components to comply with architecture rule:
 * "Components should be 'dumb' - pure rendering artifacts with no business logic."
 *
 * @param blocks - Array of blocks to search
 * @param blockId - Block ID to find (null returns null)
 * @returns Found block or null if not found
 */
export const findBlockById = (
  blocks: Block[],
  blockId: string | null
): Block | null => {
  if (!blockId) return null;
  const hasId = (block: Block): boolean => block.id === blockId;
  return blocks.find(hasId) ?? null;
};
