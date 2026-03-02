import { View, Flex } from '@adobe/react-spectrum';

import type { ViewType } from '../types';

interface CanvasPlaceholderProps {
  viewType: ViewType;
}

/**
 * CanvasPlaceholder - Temporary placeholder for Canvas2DView
 *
 * Displays a simple placeholder message for each view type
 * until the actual Canvas2DView is implemented.
 */
export function CanvasPlaceholder({ viewType }: CanvasPlaceholderProps) {
  return (
    <View
      backgroundColor="gray-50"
      height="100%"
      borderWidth="thin"
      borderColor="gray-400"
      borderRadius="medium"
    >
      <Flex height="100%" alignItems="center" justifyContent="center">
        <p>{viewType.charAt(0).toUpperCase() + viewType.slice(1)} View Canvas (Placeholder)</p>
      </Flex>
    </View>
  );
}
