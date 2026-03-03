import React from 'react';
import { Tooltip, Box } from '@mui/material';
import { ColorSwatch } from './ColorSwatch';
import type { Block } from '../types';

interface BlockButtonProps {
  block: Block;
  isSelected: boolean;
  onClick: (blockId: string) => void;
}

/**
 * BlockButton - Displays a single Minecraft block as a clickable button
 *
 * A fundamental UI primitive that represents a block type in the material palette.
 * Uses our custom ColorSwatch component for proper color display with
 * automatic accessibility support.
 */
export function BlockButton({ block, isSelected, onClick }: BlockButtonProps) {
  const handleClick = () => {
    onClick(block.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(block.id);
    }
  };

  return (
    <Tooltip title={block.name} enterDelay={300}>
      <Box
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Select ${block.name}`}
        sx={{
          display: 'inline-block',
          cursor: 'pointer',
          border: isSelected ? 3 : 2,
          borderColor: isSelected ? 'primary.main' : 'grey.800',
          borderRadius: 1,
          boxShadow: isSelected
            ? '0 0 0 2px rgba(0, 120, 212, 0.3)'
            : '0 1px 2px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
          outline: 'none',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <ColorSwatch
          color={block.color}
          colorName={block.name}
          size="L"
          rounding="default"
        />
      </Box>
    </Tooltip>
  );
}
