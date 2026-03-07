import { Box } from "@mui/material";
import { ActionGroup, ActionGroupItem } from "./ActionGroup";
import { ColorSwatch } from "./ColorSwatch";
import type { Block } from "../types";

interface QuickSelectPaletteProps {
  slots: (string | null)[];
  selectedSlotIndex: number | null;
  blocks: Block[]; // All blocks to look up by ID
  onSelectSlot: (index: number) => void;
  onAssignSlot?: (index: number) => void; // Assign currently selected block to this slot
  orientation?: "horizontal" | "vertical";
}

/**
 * QuickSelectPalette - 5-slot quick-select palette for materials
 *
 * Features:
 * - 5 slots shown as color swatches or empty squares
 * - Click to select slot (makes that block the active material)
 * - Shift+click or right-click to assign currently selected block to that slot
 * - Empty slots shown as gray squares
 *
 * Uses our custom ActionGroup with ColorSwatch for consistent
 * theming and accessibility.
 */
export function QuickSelectPalette({
  slots,
  selectedSlotIndex,
  blocks,
  onSelectSlot,
  onAssignSlot,
  orientation = "horizontal",
}: QuickSelectPaletteProps) {
  const handleSelectionChange = (keys: Set<string>) => {
    if (keys.size > 0) {
      const selectedKey = Array.from(keys)[0] as string;
      const index = parseInt(selectedKey, 10);
      onSelectSlot(index);
    }
  };

  const getBlock = (blockId: string | null): Block | null => {
    if (!blockId) {
      return null;
    }
    return blocks.find((b) => b.id === blockId) || null;
  };

  const handleSlotClick = (index: number, event: React.MouseEvent) => {
    // Shift+click or right-click to assign current block to this slot
    if (event.shiftKey || event.button === 2) {
      event.preventDefault();
      if (onAssignSlot) {
        onAssignSlot(index);
      }
    }
  };

  const handleSlotContextMenu = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    if (onAssignSlot) {
      onAssignSlot(index);
    }
  };

  const renderSlot = (index: number) => {
    const blockId = slots[index];
    const block = getBlock(blockId);

    return (
      <Box
        key={index.toString()}
        onClick={(e) => handleSlotClick(index, e)}
        onContextMenu={(e) => handleSlotContextMenu(index, e)}
        sx={{ position: "relative" }}
      >
        <ActionGroupItem
          itemKey={index.toString()}
          aria-label={block?.name || `Slot ${index + 1}`}
        >
          {block ? (
            <ColorSwatch color={block.color} />
          ) : (
            <Box
              sx={{
                width: 32,
                height: 32,
                bgcolor: "grey.300",
                borderRadius: 0.5,
                border: 1,
                borderColor: "grey.500",
              }}
            />
          )}
        </ActionGroupItem>
      </Box>
    );
  };

  const selectedKeys =
    selectedSlotIndex !== null
      ? new Set([selectedSlotIndex.toString()])
      : new Set<string>();

  return (
    <ActionGroup
      selectionMode="single"
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      aria-label="Quick select palette"
      orientation={orientation}
    >
      {[0, 1, 2, 3, 4].map(renderSlot)}
    </ActionGroup>
  );
}
