import { Box, Typography } from '@mui/material';
import { CanvasPlaceholder } from '../../panels/CanvasPlaceholder';

/**
 * Preview showcase for the CanvasPlaceholder component
 * Demonstrates placeholder shown before canvas rendering is implemented
 */
export function CanvasPlaceholderPreview() {
  return (
    <Box>
      <Typography variant="h4" component="h1">CanvasPlaceholder</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Placeholder component shown in canvas areas before full 2D/3D rendering
        is implemented. Displays a message indicating the canvas is coming soon.
      </Typography>

      {/* Default State */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Default Placeholder</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Placeholder as shown in tabbed or quad layouts.
        </Typography>
        <Box
          sx={{
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 1,
            overflow: 'hidden',
            height: 480
          }}
        >
          <CanvasPlaceholder viewType="front" />
        </Box>
      </Box>

      {/* Props Documentation */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Props Interface</Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
          <pre
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto',
              margin: 0,
            }}
          >
            {`interface CanvasPlaceholderProps {}

// No props - stateless component
// Simply displays centered message`}
          </pre>
        </Box>
      </Box>

      {/* Feature Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>Centered layout with gray background</li>
            <li>Heading and descriptive text</li>
            <li>No interactive elements</li>
            <li>Fills available space (width: 100%, height: 100%)</li>
            <li>Temporary placeholder for development</li>
          </ul>
        </Typography>
      </Box>

      {/* Usage Context */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Usage Context</Typography>
        <Typography variant="body1">
          Currently used in TabbedLayout and QuadLayout to fill canvas slots
          before Canvas2DView rendering is fully implemented. Will be replaced
          by actual canvas components as development progresses.
        </Typography>
      </Box>
    </Box>
  );
}
