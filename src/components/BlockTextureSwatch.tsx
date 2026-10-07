import { Box } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { textureResolver } from '../core/TextureResolver';
import { blockRegistry } from '../core/BlockRegistry';

interface BlockTextureSwatchProps {
  /** Block ID to render texture for */
  blockId: string;
  /** Size variant */
  size?: 'S' | 'M' | 'L';
  /** Block name for accessibility */
  blockName?: string;
  /** Border radius style */
  rounding?: 'default' | 'none';
  /** Fallback color if texture not available */
  fallbackColor?: string;
}

/**
 * BlockTextureSwatch - Display a block's texture from the atlas
 *
 * Renders a block's front face texture from the texture atlas.
 * Falls back to solid color if atlas is not loaded.
 */
export function BlockTextureSwatch({
  blockId,
  size = 'M',
  blockName,
  rounding = 'default',
  fallbackColor = '#888',
}: BlockTextureSwatchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAtlasLoaded, setIsAtlasLoaded] = useState(textureResolver.isAtlasLoaded());

  // Map size to pixel dimensions
  const sizeMap = {
    S: 16,
    M: 24,
    L: 32,
  };

  const pixelSize = sizeMap[size];

  // Listen for atlas loading
  useEffect(() => {
    const handleAtlasLoaded = () => {
      setIsAtlasLoaded(true);
    };

    if (!isAtlasLoaded) {
      textureResolver.on('atlas:ready', handleAtlasLoaded);
      return () => textureResolver.off('atlas:ready', handleAtlasLoaded);
    }
  }, [isAtlasLoaded]);

  // Render texture to canvas
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, pixelSize, pixelSize);
    ctx.imageSmoothingEnabled = false;

    const block = blockRegistry.getBlock(blockId);

    // Try tinted texture first (for glass variants)
    const tintedTexture = textureResolver.getTintedTexture(blockId, 0);
    if (tintedTexture) {
      // Fixed 0.15 opacity for glass
      if (block?.isTransparent) {
        ctx.globalAlpha = 0.15;
      }

      ctx.drawImage(tintedTexture, 0, 0, pixelSize, pixelSize);
      ctx.globalAlpha = 1.0;
      return;
    }

    // Try atlas texture
    if (!isAtlasLoaded) {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, pixelSize, pixelSize);
      return;
    }

    const atlas = textureResolver.getAtlas();
    if (!atlas) {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, pixelSize, pixelSize);
      return;
    }

    if (!atlas.image || !atlas.image.complete) {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, pixelSize, pixelSize);
      return;
    }

    const coords = textureResolver.getBlockFaceCoords(blockId, 0);
    if (!coords) {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, pixelSize, pixelSize);
      return;
    }

    try {
      ctx.drawImage(
        atlas.image,
        coords.x,
        coords.y,
        coords.width,
        coords.height,
        0,
        0,
        pixelSize,
        pixelSize,
      );
    } catch (error) {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, pixelSize, pixelSize);
    }
  }, [isAtlasLoaded, blockId, pixelSize, fallbackColor]);

  // If atlas not loaded, show fallback color
  if (!isAtlasLoaded) {
    return (
      <Box
        sx={{
          width: pixelSize,
          height: pixelSize,
          backgroundColor: fallbackColor,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: rounding === 'default' ? 0.5 : 0,
          flexShrink: 0,
        }}
        role="img"
        aria-label={blockName ? `Block: ${blockName}` : `Block: ${blockId}`}
      />
    );
  }

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
      <canvas
        ref={canvasRef}
        width={pixelSize}
        height={pixelSize}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
        }}
      />
    </Box>
  );
}
