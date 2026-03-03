import { ActionGroup, ActionGroupItem } from './ActionGroup';
import type { ViewType } from '../types';

interface ViewSelectorProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

/**
 * ViewSelector - Toggle between Front, Side, and Back editing views
 *
 * Allows users to switch between different 2D editing perspectives
 * of the 3D structure. Each view represents a different plane:
 * - Front: X-Y plane (width × height)
 * - Side: Z-Y plane (depth × height)
 * - Back: X-Y plane from opposite perspective
 *
 * Uses our custom ActionGroup with single selection mode for proper theming
 * and keyboard navigation support.
 */
export function ViewSelector({ activeView, onViewChange }: ViewSelectorProps) {
  const handleSelectionChange = (keys: Set<string>) => {
    if (keys.size > 0) {
      const selectedView = Array.from(keys)[0] as ViewType;
      onViewChange(selectedView);
    }
  };

  return (
    <ActionGroup
      selectionMode="single"
      selectedKeys={new Set([activeView])}
      onSelectionChange={handleSelectionChange}
      aria-label="View selector"
    >
      <ActionGroupItem itemKey="front">Front</ActionGroupItem>
      <ActionGroupItem itemKey="side">Side</ActionGroupItem>
      <ActionGroupItem itemKey="back">Back</ActionGroupItem>
    </ActionGroup>
  );
}
