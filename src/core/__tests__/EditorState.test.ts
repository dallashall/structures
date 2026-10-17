import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Block } from '../../types';
import { editorState } from '../EditorState';
import { blockRegistry } from '../BlockRegistry';

const STAIRS = 'minecraft:oak_stairs';
const STONE = 'minecraft:stone';
const STAIR_DEFAULTS = { facing: 'x+', half: 'bottom', shape: 'straight' } as const;

const findTestBlock = (blockId: string): Block | null =>
  blockId === STAIRS
    ? ({ id: STAIRS, name: 'Oak Stairs', category: 'wood', color: '#9c7f4e', hasBlockState: true, defaultState: STAIR_DEFAULTS } as unknown as Block)
    : null;

describe('EditorState block state after a slot change', () => {
  beforeEach(() => {
    vi.spyOn(blockRegistry, 'getBlock').mockImplementation(findTestBlock);
    editorState.setCurrentProjectId(null);
    editorState.setActiveMaterialSlot('foreground');
    editorState.setForegroundSlotIndex(0);
    editorState.setBackgroundSlotIndex(1);
    editorState.setQuickSelectSlot(0, STONE);
    editorState.setQuickSelectSlot(1, STAIRS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('takes the stairs defaults when the active slot switches to the stairs', () => {
    expect(editorState.getActiveBlockState()).toEqual({});
    editorState.setActiveMaterialSlot('background');
    expect(editorState.getActiveBlockState()).toEqual(STAIR_DEFAULTS);
  });

  it('takes the stairs defaults when the stairs land in the active slot', () => {
    editorState.assignToActiveSlot(STAIRS);
    expect(editorState.getActiveBlockState()).toEqual(STAIR_DEFAULTS);
  });

  it('keeps a chosen facing while the selected block stays the same', () => {
    editorState.setActiveMaterialSlot('background');
    editorState.rotateFacing();
    const turned = editorState.getActiveBlockState().facing;
    editorState.setQuickSelectSlot(4, STONE);
    expect(editorState.getActiveBlockState().facing).toBe(turned);
  });
});
