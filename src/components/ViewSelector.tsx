import { ActionGroup, Item } from '@adobe/react-spectrum';
import type { Selection } from '@react-types/shared';
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
 * Uses ActionGroup with single selection mode for proper theming
 * and keyboard navigation support.
 */
export function ViewSelector({ activeView, onViewChange }: ViewSelectorProps) {
  const handleSelectionChange = (keys: Selection) => {
    if (keys !== 'all' && keys.size > 0) {
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
      <Item key="front">Front</Item>
      <Item key="side">Side</Item>
      <Item key="back">Back</Item>
    </ActionGroup>
  );
}
