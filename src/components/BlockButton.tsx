import { ColorSwatch, TooltipTrigger, Tooltip } from '@adobe/react-spectrum';
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
 * Uses React Spectrum's ColorSwatch component for proper color display with
 * automatic accessibility support via the colorName prop.
 */
export function BlockButton({ block, isSelected, onClick }: BlockButtonProps) {
  const handleClick = () => {
    onClick(block.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(block.id);
    }
  };

  return (
    <TooltipTrigger delay={300}>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyPress={handleKeyPress}
        aria-label={`Select ${block.name}`}
        style={{
          display: 'inline-block',
          cursor: 'pointer',
          border: isSelected
            ? '3px solid var(--spectrum-global-color-blue-600)'
            : '2px solid var(--spectrum-global-color-gray-800)',
          borderRadius: '4px',
          boxShadow: isSelected
            ? '0 0 0 2px rgba(0, 120, 212, 0.3)'
            : '0 1px 2px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <ColorSwatch
          color={block.color}
          colorName={block.name}
          size="L"
          rounding="default"
        />
      </div>
      <Tooltip>{block.name}</Tooltip>
    </TooltipTrigger>
  );
}
