import { IconButton, Stack } from '@mui/material';
import { Redo, Undo } from '@mui/icons-material';

import { REDO_SHORTCUT_LABEL, UNDO_SHORTCUT_LABEL } from '../core/Shortcuts';

import { withEditHistory } from '../hocs/withEditHistory';
import type { WithEditHistoryProps } from '../hocs/withEditHistory';

import { ShortcutTooltip } from './ShortcutTooltip';

/**
 * UndoRedoButtons - Toolbar buttons for the open project's edit history
 */
function UndoRedoButtonsComponent({ canUndo, canRedo, onUndo, onRedo }: WithEditHistoryProps) {
  return (
    <Stack direction="row" spacing={0.5}>
      <ShortcutTooltip title="Undo" shortcut={UNDO_SHORTCUT_LABEL}>
        {/* A disabled button fires no events, so the tooltip needs a wrapper to anchor on */}
        <span>
          <IconButton aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
            <Undo />
          </IconButton>
        </span>
      </ShortcutTooltip>
      <ShortcutTooltip title="Redo" shortcut={REDO_SHORTCUT_LABEL}>
        <span>
          <IconButton aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
            <Redo />
          </IconButton>
        </span>
      </ShortcutTooltip>
    </Stack>
  );
}

export const UndoRedoButtons = withEditHistory<object>(UndoRedoButtonsComponent);
