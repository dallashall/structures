import { Box } from '@mui/material';
import type { CellComponentProps } from 'react-window';

import type { Block } from '../types';

import { MaterialTile } from './MaterialTile';

interface MaterialGridCellProps {
  blocks: Block[];
  columnCount: number;
  onPick: (blockId: string) => void;
}

export function MaterialGridCell({
  ariaAttributes,
  columnIndex,
  rowIndex,
  style,
  blocks,
  columnCount,
  onPick,
}: CellComponentProps<MaterialGridCellProps>) {
  const block = blocks[rowIndex * columnCount + columnIndex];
  if (!block) return null;

  return (
    <Box style={style} {...ariaAttributes} sx={{ p: 0.5 }}>
      <MaterialTile block={block} onPick={onPick} />
    </Box>
  );
}
