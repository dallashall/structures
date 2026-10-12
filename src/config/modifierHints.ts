import type { HeldModifiers, PaintMode } from '../types';

export interface ModifierHint {
  key: keyof HeldModifiers;
  keyLabel: string;
  action: string;
}

const SHIFT = { key: 'shift', keyLabel: 'Shift' } as const;
const ALT = { key: 'alt', keyLabel: 'Alt' } as const;

/**
 * The modifiers each tool reads. Tools absent from this map ignore Shift and Alt.
 */
export const MODIFIER_HINTS: Partial<Record<PaintMode, ModifierHint[]>> = {
  point: [{ ...SHIFT, action: 'Line from last block' }],
  outline: [
    { ...SHIFT, action: 'Square' },
    { ...ALT, action: 'From center' },
  ],
  circle: [
    { ...SHIFT, action: 'Circle' },
    { ...ALT, action: 'From center' },
  ],
};
