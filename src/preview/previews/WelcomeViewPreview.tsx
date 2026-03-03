import { Box, Typography } from '@mui/material';
import { WelcomeView } from '../../views/WelcomeView';

export function WelcomeViewPreview() {
  const handleNewProject = () => console.log('[Preview] New project');
  const handleOpenProject = (id: string) => console.log('[Preview] Open:', id);
  const handleLoadFromFile = () => console.log('[Preview] Load from file');

  return (
    <Box>
      <Typography variant="h4" component="h1">WelcomeView</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Landing page shown when no project is loaded. Displays recent projects
        and options to create new or load from file.
      </Typography>

      <Box sx={{ mt: 6, height: '600px', border: 1, borderColor: 'grey.300' }}>
        <WelcomeView
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onLoadFromFile={handleLoadFromFile}
        />
      </Box>
    </Box>
  );
}
