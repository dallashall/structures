import { useState } from 'react';
import { View, Heading, Content } from '@adobe/react-spectrum';
import { TabbedLayout } from '../../layouts/TabbedLayout';
import { mockProject } from '../mockData';
import type { ViewType } from '../../types';

export function TabbedLayoutPreview() {
  const [activeView, setActiveView] = useState<ViewType>('front');
  
  const handleViewChange = (key: React.Key) => {
    setActiveView(key as ViewType);
  };

  return (
    <View>
      <Heading level={1}>TabbedLayout</Heading>
      <Content marginBottom="size-400">
        Single-panel tabbed layout with view selector tabs.
      </Content>

      <View marginTop="size-600" height="600px" borderWidth="thin">
        <TabbedLayout
          activeView={activeView}
          onViewChange={handleViewChange}
          project={mockProject}
          activeLayers={{ x: 5, y: 3, z: 7 }}
          isPlacementMode={false}
          selectedBlockId="stone"
        />
      </View>
    </View>
  );
}
