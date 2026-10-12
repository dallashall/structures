import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Button,
  Typography,
  Box,
} from '@mui/material';

import { ModalDialog } from './ModalDialog';

const TITLE_ID = 'meta-block-title';

interface MetaBlockPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A native modal dialog, so focus starts on "Got it" and stays inside until it closes.
 */
export function MetaBlockPlacementModal({
  isOpen,
  onClose,
}: MetaBlockPlacementModalProps) {
  const handleGotIt = () => {
    onClose();
  };

  return (
    <ModalDialog open={isOpen} onClose={handleGotIt} labelledBy={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>Place the Meta Block</DialogTitle>
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

          <Typography variant="body1">
            Click on any 2D view to place the meta block and begin building
            your structure.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleGotIt} data-autofocus>
          Got it
        </Button>
      </DialogActions>
    </ModalDialog>
  );
}
