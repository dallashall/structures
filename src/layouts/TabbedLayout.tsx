import { Tabs, TabList, TabPanels, Item, View, Flex } from '@adobe/react-spectrum';

import type { ViewType } from '../types';

import { CanvasPlaceholder } from '../panels/CanvasPlaceholder';

interface TabbedLayoutProps {
  activeView: ViewType;
  onViewChange: (key: React.Key) => void;
  project: any;
  activeLayers: any;
  isPlacementMode: boolean;
}

/**
 * TabbedLayout - Single canvas with tab navigation
 *
 * Displays one view at a time with tabs to switch between different
 * orthographic views and 3D preview.
 */
export function TabbedLayout({
  activeView,
  onViewChange,
}: TabbedLayoutProps) {
  return (
    <Tabs
      selectedKey={activeView}
      onSelectionChange={onViewChange}
      height="100%"
    >
      <TabList>
        <Item key="front">Front</Item>
        <Item key="back">Back</Item>
        <Item key="left">Left</Item>
        <Item key="right">Right</Item>
        <Item key="top">Top</Item>
        <Item key="bottom">Bottom</Item>
        <Item key="3d">3D Preview</Item>
      </TabList>
      <TabPanels>
        {(['front', 'back', 'left', 'right', 'top', 'bottom', '3d'] as const).map((view) => (
          <Item key={view}>
            <View padding="size-200" height="100%">
              {view === '3d' ? (
                <View backgroundColor="gray-200" height="100%">
                  <Flex height="100%" alignItems="center" justifyContent="center">
                    <p>3D Preview (Placeholder)</p>
                  </Flex>
                </View>
              ) : (
                <CanvasPlaceholder viewType={view} />
              )}
            </View>
          </Item>
        ))}
      </TabPanels>
    </Tabs>
  );
}
