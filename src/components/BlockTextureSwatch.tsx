import { Box } from '@mui/material';

import { swatchPainter } from '../core/SwatchPainter';

interface BlockTextureSwatchProps {
  blockId: string;
  size?: 'S' | 'M' | 'L';
  blockName?: string;
  rounding?: 'default' | 'none';
  fallbackColor?: string;
}

const PIXEL_SIZES = { S: 16, M: 24, L: 32 };

/**
 * Shows a block's front-face texture from the atlas. swatchPainter paints the canvas, and shows the fallback color until the atlas is ready.
 */
export function BlockTextureSwatch({
  blockId,
  size = 'M',
  blockName,
  rounding = 'default',
  fallbackColor = '#888',
}: BlockTextureSwatchProps) {
  const pixelSize = PIXEL_SIZES[size];

  return (
    <Box
      sx={{
        width: pixelSize,
        height: pixelSize,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: rounding === 'default' ? 0.5 : 0,
        flexShrink: 0,
        overflow: 'hidden',
      }}
      role="img"
      aria-label={blockName ? `Block: ${blockName}` : `Block: ${blockId}`}
    >
      <Box
        component="canvas"
        ref={swatchPainter.refFor(blockId, pixelSize, fallbackColor)}
        sx={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }}
      />
    </Box>
  );
}
