import { Alert, AlertTitle, Box } from '@mui/material';

/**
 * TexturesMissingAlert - Explains flat block colors when the build has no texture atlas
 */
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
