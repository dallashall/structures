import { Chip, Stack } from '@mui/material';

import type { HeldModifiers } from '../types';
import type { ModifierHint } from '../config/modifierHints';

interface ModifierHintsProps {
  hints: ModifierHint[];
  heldModifiers: HeldModifiers;
}

/**
 * The active tool's modifier keys. A held key's chip fills in.
 */
export function ModifierHints({ hints, heldModifiers }: ModifierHintsProps) {
  const renderHint = (hint: ModifierHint) => {
    const isHeld = heldModifiers[hint.key];
    return (
      <Chip
        key={hint.key}
        size="small"
        label={`${hint.keyLabel}: ${hint.action}`}
        color={isHeld ? 'primary' : 'default'}
        variant={isHeld ? 'filled' : 'outlined'}
      />
    );
  };

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" aria-label="Modifier keys">
      {hints.map(renderHint)}
    </Stack>
  );
}
