import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { TabbedLayout } from '../../layouts/TabbedLayout';
import { mockProject } from '../mockData';
import type { ViewType } from '../../types';

export function TabbedLayoutPreview() {
  const [activeView, setActiveView] = useState<ViewType>('front');

  const handleViewChange = (key: React.Key) => {
    setActiveView(key as ViewType);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">TabbedLayout</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Single-panel tabbed layout with view selector tabs.
      </Typography>

      <Box sx={{ mt: 6, height: '600px', border: 1, borderColor: 'grey.300' }}>
        <TabbedLayout
          activeView={activeView}
          onViewChange={handleViewChange}
          project={mockProject}
          activeLayers={{ x: 5, y: 3, z: 7 }}
          selectedBlockId="stone"
        />
      </Box>
    </Box>
  );
}
