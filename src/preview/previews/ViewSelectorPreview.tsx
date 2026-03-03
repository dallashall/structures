import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { ViewSelector } from '../../components/ViewSelector';
import { mockCallbacks } from '../mockData';
import type { ViewType } from '../../types';

/**
 * Preview showcase for the ViewSelector component
 * Demonstrates view switching functionality
 */
export function ViewSelectorPreview() {
  const [activeView, setActiveView] = useState<ViewType>('front');

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    mockCallbacks.onViewChange(view);
  };

  const renderViewExplanation = () => {
    if (activeView === 'front') {
      return (
        <Typography variant="body1">
          <strong>Front View:</strong> Edit the front face of the structure.
          Shows width (X-axis) and height (Y-axis).
        </Typography>
      );
    }
    if (activeView === 'left') {
      return (
        <Typography variant="body1">
          <strong>Left View:</strong> Edit the left face of the structure. Shows
          depth (Z-axis) and height (Y-axis).
        </Typography>
      );
    }
    return (
      <Typography variant="body1">
        <strong>Back View:</strong> Edit the back face of the structure. Shows
        width (X-axis) and height (Y-axis) from the opposite side.
      </Typography>
    );
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">ViewSelector</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        A button group for toggling between different 2D editing views (Front,
        Side, Back) of the 3D structure.
      </Typography>

      {/* Default State (Front) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Front View Selected</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Default view showing the X-Y plane (width × height)
        </Typography>
        <ViewSelector
          activeView="front"
          onViewChange={mockCallbacks.onViewChange}
        />
      </Box>

      {/* Left View */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Left View Selected</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Left view showing the Z-Y plane (depth × height)
        </Typography>
        <ViewSelector
          activeView="left"
          onViewChange={mockCallbacks.onViewChange}
        />
      </Box>

      {/* Back View */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Back View Selected</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Back view showing the X-Y plane from opposite perspective
        </Typography>
        <ViewSelector
          activeView="back"
          onViewChange={mockCallbacks.onViewChange}
        />
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click buttons to switch views. Currently active:{' '}
          <strong>{activeView}</strong>
        </Typography>
        <ViewSelector activeView={activeView} onViewChange={handleViewChange} />
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 3 }}>
          <Typography variant="h6" component="h4">View Explanation</Typography>
          {renderViewExplanation()}
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
            {`interface ViewSelectorProps {
  activeView: ViewType;           // 'front' | 'side' | 'back'
  onViewChange: (view: ViewType) => void;  // View change callback
}`}
          </pre>
        </Box>
      </Box>
    </Box>
  );
}
