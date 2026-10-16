import { Box, IconButton, ButtonBase } from "@mui/material";
import { Apps } from "@mui/icons-material";

import type { Block } from "../types";

import { SHORTCUTS, quickSelectShortcut } from "../core/Shortcuts";

import { BlockTextureSwatch } from "./BlockTextureSwatch";
import { ShortcutTooltip } from "./ShortcutTooltip";
import { findBlockById } from "../utils/blockUtils";

interface QuickSelectPaletteProps {
  slots: (string | null)[];
  blocks: Block[];
  onSelectSlot: (index: number) => void; // Makes the slot's block the active material
  onAssignSlot?: (index: number) => void; // Right-click: stores the selected block in the slot
  onOpenBrowser?: () => void;
  orientation?: "horizontal" | "vertical";
}

export function QuickSelectPalette({
  slots,
  blocks,
  onSelectSlot,
  onAssignSlot,
  onOpenBrowser,
  orientation = "horizontal",
}: QuickSelectPaletteProps) {
  const isVertical = orientation === "vertical";

  const handleSlotClick = (index: number) => {
    onSelectSlot(index);
  };

  const handleSlotRightClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    if (onAssignSlot) {
      onAssignSlot(index);
    }
  };

  const createSlotClickHandler = (index: number) => () => {
    handleSlotClick(index);
  };

  const createSlotContextMenuHandler = (index: number) => (event: React.MouseEvent) => {
    handleSlotRightClick(index, event);
  };

  const renderSlot = (index: number) => {
    const blockId = slots[index];
    const block = findBlockById(blocks, blockId);

    const button = (
      <ButtonBase
        onClick={createSlotClickHandler(index)}
        onContextMenu={createSlotContextMenuHandler(index)}
        aria-label={block?.name || `Slot ${index + 1}`}
        sx={{
          width: 40,
          height: 40,
          border: 1,
          borderColor: "chrome.controlBorder",
          borderRadius: 1,
          p: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        {block ? (
          <BlockTextureSwatch blockId={block.id} blockName={block.name} fallbackColor={block.color} />
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
      </ButtonBase>
    );

    return (
      <ShortcutTooltip
        key={index}
        title={block?.name || `Slot ${index + 1}`}
        shortcut={quickSelectShortcut(index)}
        placement="top"
      >
        {button}
      </ShortcutTooltip>
    );
  };

  return (
    <Box
      sx={
        isVertical
          ? {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0.5,
              px: 0.5,
            }
          : {
              display: "flex",
              gap: 0.5,
            }
      }
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(renderSlot)}

      {isVertical && onOpenBrowser && (
        <ShortcutTooltip title="Open Material Browser" shortcut={SHORTCUTS.materialBrowser} placement="right">
          <IconButton
            onClick={onOpenBrowser}
            aria-label="Open material browser"
            sx={{
              width: 40,
              height: 40,
              border: 1,
              borderColor: "chrome.controlBorder",
              borderRadius: 1,
              bgcolor: "background.paper",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <Apps fontSize="small" />
          </IconButton>
        </ShortcutTooltip>
      )}
    </Box>
  );
}
