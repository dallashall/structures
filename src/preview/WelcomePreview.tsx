import { Box, Typography, List, ListItem } from '@mui/material';

export function WelcomePreview() {
  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom>
        Welcome to Component Preview
      </Typography>
      <Typography variant="body1" paragraph>
        This is a lightweight component preview system for the Minecraft Magic
        Blueprint System.
      </Typography>
      <Typography variant="body1" paragraph>
        Select a component from the sidebar to view its preview and
        interactive states.
      </Typography>
      <Box
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mt: 4,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Features
        </Typography>
        <List>
          <ListItem>Zero additional dependencies</ListItem>
          <ListItem>Hash-based routing (#/preview)</ListItem>
          <ListItem>Hot module replacement (HMR) support</ListItem>
          <ListItem>Interactive component testing with mock data</ListItem>
        </List>
      </Box>
    </Box>
  );
}
