import { Grid, View, Flex } from '@adobe/react-spectrum';

import { CanvasPlaceholder } from '../panels/CanvasPlaceholder';

interface QuadLayoutProps {
  project: any;
  activeLayers: any;
  isPlacementMode: boolean;
}

/**
 * QuadLayout - 2x2 grid with 3 2D views + 3D preview
 *
 * Displays four viewports in a grid:
 * - Front view (top-left)
 * - Left view (top-right)
 * - Top view (bottom-left)
 * - 3D Preview (bottom-right)
 */
export function QuadLayout({}: QuadLayoutProps) {
  return (
    <Grid
      columns={['1fr', '1fr']}
      rows={['1fr', '1fr']}
      height="100%"
      gap="size-100"
    >
      <View backgroundColor="gray-100" padding="size-200">
        <CanvasPlaceholder viewType="front" />
      </View>
      <View backgroundColor="gray-100" padding="size-200">
        <CanvasPlaceholder viewType="left" />
      </View>
      <View backgroundColor="gray-100" padding="size-200">
        <CanvasPlaceholder viewType="top" />
      </View>
      <View backgroundColor="gray-200" padding="size-200">
        <Flex alignItems="center" justifyContent="center">
          <p>3D Preview (Placeholder)</p>
        </Flex>
      </View>
    </Grid>
  );
}
