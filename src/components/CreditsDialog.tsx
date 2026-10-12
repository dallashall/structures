import { Button, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';

import { FONT_CREDITS, LIBRARY_CREDITS, MINECRAFT_NOTICE, PROJECT_CREDITS, TEXTURE_CREDITS } from '../config/credits';

import { CreditSection } from './CreditSection';
import { ModalDialog } from './ModalDialog';

const TITLE_ID = 'credits-title';

interface CreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The texture pack license (CC BY-NC-ND) requires credit, a license link, and a note on changes.
 */
export function CreditsDialog({ isOpen, onClose }: CreditsDialogProps) {
  return (
    <ModalDialog open={isOpen} onClose={onClose} labelledBy={TITLE_ID} maxWidth="sm" fullWidth sx={{ maxHeight: '80vh' }}>
      <DialogTitle id={TITLE_ID}>Credits</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={3}>
          <CreditSection heading="This app" credits={PROJECT_CREDITS} />
          <CreditSection heading="Textures" credits={TEXTURE_CREDITS} />
          <CreditSection heading="Fonts" credits={FONT_CREDITS} />
          <CreditSection heading="Libraries" credits={LIBRARY_CREDITS} />
          <Typography variant="caption" color="text.secondary">
            {MINECRAFT_NOTICE}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} data-autofocus>
          Close
        </Button>
      </DialogActions>
    </ModalDialog>
  );
}
