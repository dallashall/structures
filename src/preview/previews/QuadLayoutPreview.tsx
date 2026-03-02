import { View, Heading, Content } from '@adobe/react-spectrum';
import { QuadLayout } from '../../layouts/QuadLayout';
import { mockProject } from '../mockData';

export function QuadLayoutPreview() {
  return (
    <View>
      <Heading level={1}>QuadLayout</Heading>
      <Content marginBottom="size-400">
        Four-panel grid layout showing multiple orthographic views simultaneously.
      </Content>

      <View marginTop="size-600" height="600px" borderWidth="thin">
        <QuadLayout
          project={mockProject}
          activeLayers={{ x: 5, y: 3, z: 7 }}
          isPlacementMode={false}
          selectedBlockId="stone"
        />
      </View>
    </View>
  );
}
