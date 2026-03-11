import { ToggleButton } from "@mui/material";

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
