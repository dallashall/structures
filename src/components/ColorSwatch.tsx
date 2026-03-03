import { Box } from '@mui/material';

interface ColorSwatchProps {
  /** Hex color to display */
  color: string;
  /** Size variant */
  size?: 'S' | 'M' | 'L';
  /** Color name for accessibility */
  colorName?: string;
  /** Border radius style */
  rounding?: 'default' | 'none';
}

/**
 * ColorSwatch - Display a color square with optional size variants
 *
 * A simple component for displaying color swatches in the material palette,
 * block buttons, and other color-related UI elements.
 */
export function ColorSwatch({
  color,
  size = 'M',
  colorName,
  rounding = 'default',
}: ColorSwatchProps) {
  // Map size to pixel dimensions
  const sizeMap = {
    S: 16,
    M: 24,
    L: 32,
  };

  const pixelSize = sizeMap[size];

  return (
    <Box
      sx={{
        width: pixelSize,
        height: pixelSize,
        backgroundColor: color,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: rounding === 'default' ? 0.5 : 0,
        flexShrink: 0,
      }}
      role="img"
      aria-label={colorName ? `Color: ${colorName}` : `Color: ${color}`}
    />
  );
}
