import { Alert, AlertTitle, Box } from '@mui/material';

export function TexturesMissingAlert() {
  return (
    <Alert severity="info" variant="outlined">
      <AlertTitle>Textures are not installed</AlertTitle>
      Blocks show flat colors. Run{' '}
      <Box component="code" sx={{ fontFamily: '"Red Hat Mono", monospace' }}>
        npm run setup:textures
      </Box>{' '}
      to download the texture pack, then reload.
    </Alert>
  );
}
