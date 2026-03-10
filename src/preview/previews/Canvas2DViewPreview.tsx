import { Box, Typography } from '@mui/material';
import { Canvas2DView } from '../../panels/Canvas2DView';
import { mockProject } from '../mockData';

export function Canvas2DViewPreview() {
  return (
    <Box>
      <Typography variant="h4" component="h1">Canvas2DView</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        2D orthographic canvas with grid rendering, block display, and interactive editing.
      </Typography>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Front View</Typography>
        <Box sx={{ height: '400px', width: '400px', border: 1, borderColor: 'grey.300' }}>
          <Canvas2DView
            viewType="front"
            project={mockProject}
            activeLayers={{ x: 5, y: 3, z: 7 }}
            width={400}
            height={400}
            selectedBlockId="stone"
            isPlacementMode={false}
          />
        </Box>
      </Box>
    </Box>
  );
}
