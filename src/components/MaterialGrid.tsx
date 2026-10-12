import React from 'react';
import { Box, Typography } from '@mui/material';
import { Grid } from 'react-window';

import type { Block } from '../types';

import { MaterialGridCell } from './MaterialGridCell';

// Every tile shares one size, so the grid computes positions instead of measuring them
const MIN_COLUMN_WIDTH = 80;
const ROW_HEIGHT = 72;
// Rows rendered beyond the visible area, so fast scrolls show no blank rows
const OVERSCAN_ROWS = 2;

interface MaterialGridProps {
  blocks: Block[];
  width: number;
  // Dims the grid while it still shows results for an older query or tab
  isStale: boolean;
  onResize: (size: { width: number }) => void;
  onPick: (blockId: string) => void;
}

/**
 * Only the visible rows mount. Memoized, so a keystroke that changes only the search field skips this render.
 */
function MaterialGridComponent({ blocks, width, isStale, onResize, onPick }: MaterialGridProps) {
  const columnCount = Math.max(1, Math.floor(width / MIN_COLUMN_WIDTH));
  const rowCount = Math.ceil(blocks.length / columnCount);
  const cellProps = { blocks, columnCount, onPick };

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative', opacity: isStale ? 0.6 : 1, transition: 'opacity 0.15s' }}>
      <Grid
        cellComponent={MaterialGridCell}
        cellProps={cellProps}
        columnCount={columnCount}
        columnWidth={`${100 / columnCount}%`}
        rowCount={rowCount}
        rowHeight={ROW_HEIGHT}
        overscanCount={OVERSCAN_ROWS}
        onResize={onResize}
        style={{ height: '100%', width: '100%' }}
      />
      {blocks.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ position: 'absolute', inset: 0, textAlign: 'center', pt: 4 }}>
          No materials found
        </Typography>
      )}
    </Box>
  );
}

export const MaterialGrid = React.memo(MaterialGridComponent);
