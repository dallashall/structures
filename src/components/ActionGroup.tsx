import { ToggleButtonGroup, ToggleButton } from "@mui/material";

export interface ActionGroupItemProps {
  /** Unique key for this item */
  itemKey: string;
  /** Content to display */
  children: React.ReactNode;
  /** Accessible label */
  "aria-label"?: string;
}

/**
 * ActionGroupItem - Individual item within an ActionGroup
 *
 * Used as children of ActionGroup to define selectable items.
 */
export function ActionGroupItem({
  itemKey,
  children,
  "aria-label": ariaLabel,
}: ActionGroupItemProps) {
  return (
    <ToggleButton value={itemKey} aria-label={ariaLabel}>
      {children}
    </ToggleButton>
  );
}

interface ActionGroupProps {
  /** Selection mode */
  selectionMode?: "single" | "multiple" | "none";
  /** Currently selected keys */
  selectedKeys?: Set<string>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Child ActionGroupItem components */
  children: React.ReactNode;
  /** Visual density */
  density?: "compact" | "default";
  /** Accessible label */
  "aria-label": string;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
}

/**
 * ActionGroup - Button group with selection state
 *
 * Provides a group of toggle buttons that support single or multiple selection.
 * Used for material palette block selection and view mode selection.
 */
export function ActionGroup({
  selectionMode = "single",
  selectedKeys = new Set(),
  onSelectionChange,
  children,
  density = "default",
  "aria-label": ariaLabel,
  orientation = "horizontal",
}: ActionGroupProps) {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: string | string[],
  ) => {
    if (selectionMode === "none" || !onSelectionChange) {
      return;
    }

    let newKeys: Set<string>;
    if (selectionMode === "single") {
      // For single selection, newValue is a string or null
      newKeys = newValue ? new Set([newValue as string]) : new Set();
    } else {
      // For multiple selection, newValue is an array
      newKeys = new Set(newValue as string[]);
    }

    onSelectionChange(newKeys);
  };

  // Convert Set to array for MUI ToggleButtonGroup
  const value =
    selectionMode === "single"
      ? Array.from(selectedKeys)[0] || null
      : Array.from(selectedKeys);

  return (
    <ToggleButtonGroup
      value={value}
      onChange={handleChange}
      exclusive={selectionMode === "single"}
      aria-label={ariaLabel}
      orientation={orientation}
      size={density === "compact" ? "small" : "medium"}
    >
      {children}
    </ToggleButtonGroup>
  );
}
