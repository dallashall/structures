import { View, Heading, Content } from '@adobe/react-spectrum';
import { Canvas2DView } from '../../panels/Canvas2DView';
import { mockProject, mockBlocks } from '../mockData';

export function Canvas2DViewPreview() {
  return (
    <View>
      <Heading level={1}>Canvas2DView</Heading>
      <Content marginBottom="size-400">
        2D orthographic canvas with grid rendering and block display.
      </Content>

      <View marginTop="size-600">
        <Heading level={2}>Front View</Heading>
        <View height="400px" width="400px" borderWidth="thin">
          <Canvas2DView
            viewType="front"
            project={mockProject}
            activeLayers={{ x: 5, y: 3, z: 7 }}
            blocks={mockBlocks}
            width={400}
            height={400}
          />
        </View>
      </View>
    </View>
  );
}
