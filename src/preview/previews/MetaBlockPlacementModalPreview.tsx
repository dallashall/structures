import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { MetaBlockPlacementModal } from '../../components/MetaBlockPlacementModal';

/**
 * Preview showcase for the MetaBlockPlacementModal component
 * Demonstrates informational modal shown before meta block placement
 */
export function MetaBlockPlacementModalPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleOpen = () => {
    setAcknowledged(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setAcknowledged(true);
    setIsOpen(false);
    console.log('[Preview] Meta block modal acknowledged');
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">MetaBlockPlacementModal</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Informational modal explaining the meta block and guiding users to place
        it as their first action after creating a new project.
      </Typography>

      {/* Context */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Context</Typography>
        <Typography variant="body1">
          The meta block is a special marker that defines the entry point and
          orientation for structures imported into Minecraft. This modal appears
          automatically when a new project is created, before the editor is
          shown.
        </Typography>
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click the button to open the modal as users would see it on first
          project creation.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Show Meta Block Modal
        </Button>

        {acknowledged && (
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 3 }}>
            <Typography variant="h6" component="h4">Modal Acknowledged</Typography>
            <Typography variant="body1">
              User clicked "Got it" and is now in placement mode. Canvas would
              show crosshair cursor and await first click to place meta block.
            </Typography>
          </Box>
        )}

        <MetaBlockPlacementModal isOpen={isOpen} onClose={handleClose} />
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
            {`interface MetaBlockPlacementModalProps {
  isOpen: boolean;    // Dialog visibility state
  onClose: () => void; // Callback when "Got it" is clicked
}

// After onClose is called:
// - Editor enters placement mode
// - Canvas shows crosshair cursor
// - First click places meta block
// - Modal does not reappear for this project`}
          </pre>
        </Box>
      </Box>

      {/* Feature Notes */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>Clear explanation of meta block purpose</li>
            <li>Visual indicator (placeholder for future illustration)</li>
            <li>Single "Got it" button to acknowledge and continue</li>
            <li>Non-dismissible (must click button to close)</li>
            <li>Shown once per project on creation</li>
            <li>Guides user workflow for proper structure setup</li>
          </ul>
        </Typography>
      </Box>

      {/* Meta Block Purpose */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Meta Block Purpose</Typography>
        <Typography variant="body1" component="div">
          The meta block serves two functions:
          <ol>
            <li>
              <strong>Entry Point:</strong> Defines where the player will stand
              when the structure is summoned in Minecraft
            </li>
            <li>
              <strong>Orientation:</strong> Defines which direction the player
              faces (north/south/east/west), determining how the structure is
              rotated
            </li>
          </ol>
        </Typography>
      </Box>
    </Box>
  );
}
