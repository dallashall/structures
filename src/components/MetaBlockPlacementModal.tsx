import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Button,
  Typography,
  Box,
} from '@mui/material';

interface MetaBlockPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MetaBlockPlacementModal - Informational modal before meta block placement
 *
 * Explains the purpose of the meta block and guides the user to place it
 * as their first action after creating a new project.
 *
 * Features:
 * - Heading and description of meta block purpose
 * - Placeholder for image/illustration (future enhancement)
 * - "Got it" button to close and enter placement mode
 *
 * Uses MUI Dialog for consistent theming and accessibility.
 */
export function MetaBlockPlacementModal({
  isOpen,
  onClose,
}: MetaBlockPlacementModalProps) {
  const handleGotIt = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleGotIt}>
      <DialogTitle>Place the Meta Block</DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            The <strong>meta block</strong> is the origin point for your structure.
            It represents the location where the structure will be activated
            in-game.
          </Typography>

          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Key points:</strong>
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              <li>
                <Typography variant="body2">
                  All other blocks are positioned relative to the meta block
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  It has a directional arrow showing the &quot;front&quot; of your structure
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  In-game, this represents either an activatable block or a player
                  holding an item
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Note:</strong> Once placed, the meta block cannot be moved
                </Typography>
              </li>
            </Box>
          </Box>

          {/* Placeholder for image/illustration */}
          {/* <img src="/meta-block-illustration.png" alt="Meta block example" /> */}

          <Typography variant="body1">
            Click on any 2D view to place the meta block and begin building
            your structure.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleGotIt} autoFocus>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
