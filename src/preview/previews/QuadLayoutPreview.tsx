import { Box, Typography } from '@mui/material';
import { QuadLayout } from '../../layouts/QuadLayout';

export function QuadLayoutPreview() {
  return (
    <Box>
      <Typography variant="h4" component="h1">QuadLayout</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Four-panel grid layout showing multiple orthographic views simultaneously.
      </Typography>

      <Box sx={{ mt: 6, height: '600px', border: 1, borderColor: 'grey.300' }}>
        <QuadLayout
          activeLayers={{ x: 5, y: 3, z: 7 }}
        />
      </Box>
    </Box>
  );
}
