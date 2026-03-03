import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Toolbar } from '../../layouts/Toolbar';
import { mockCallbacks } from '../mockData';

/**
 * Preview showcase for the Toolbar component
 * Demonstrates toolbar with and without active project
 */
export function ToolbarPreview() {
  const [is3DMode, setIs3DMode] = useState(false);

  const handleToggle3D = () => {
    setIs3DMode(!is3DMode);
    mockCallbacks.onToggle3D();
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">Toolbar</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Application header with primary actions: New, Save, Open projects, and
        toggle between 2D editor and 3D preview mode.
      </Typography>

      {/* No Project Active */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">No Active Project</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Toolbar state when no project is loaded. Note that Save button is
          disabled.
        </Typography>
        <Box
          sx={{
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <Toolbar
            projectName={null}
            layoutMode="tabbed"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={false}
          />
        </Box>
      </Box>

      {/* With Project (2D Mode) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Active Project - 2D Editor Mode</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Toolbar with an active project named "Sample House". All buttons
          enabled.
        </Typography>
        <Box
          sx={{
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <Toolbar
            projectName="Sample House"
            layoutMode="tabbed"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={false}
          />
        </Box>
      </Box>

      {/* With Project (3D Mode) */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Active Project - 3D Preview Mode</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Toolbar with 3D mode active (note the accent variant on Toggle button).
        </Typography>
        <Box
          sx={{
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <Toolbar
            projectName="Medieval Castle"
            layoutMode="quad"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={true}
          />
        </Box>
      </Box>

      {/* Long Project Name */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Long Project Name</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Toolbar with a longer project name to test text overflow behavior.
        </Typography>
        <Box
          sx={{
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <Toolbar
            projectName="My Very Long Project Name For A Complex Minecraft Structure"
            layoutMode="tabbed"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
            onToggle3D={mockCallbacks.onToggle3D}
            is3DMode={false}
          />
        </Box>
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click buttons to test interactions. Toggle 3D mode button changes
          variant. Check console for callback logs.
        </Typography>
        <Box
          sx={{
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <Toolbar
            projectName="Interactive Demo Project"
            layoutMode="tabbed"
            onNewProject={mockCallbacks.onNewProject}
            onSaveProject={mockCallbacks.onSaveProject}
            onOpenProject={mockCallbacks.onOpenProject}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
            onToggle3D={handleToggle3D}
            is3DMode={is3DMode}
          />
        </Box>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 2 }}>
          <Typography variant="h6" component="h4">Current Mode</Typography>
          <Typography variant="body1">
            <strong>{is3DMode ? '3D Preview Mode' : '2D Editor Mode'}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Multiple Instances */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Multiple Project Examples</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Different project names and states
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Toolbar
              projectName="Village House"
              layoutMode="tabbed"
              onNewProject={mockCallbacks.onNewProject}
              onSaveProject={mockCallbacks.onSaveProject}
              onOpenProject={mockCallbacks.onOpenProject}
              onLayoutModeChange={mockCallbacks.onLayoutModeChange}
              onToggle3D={mockCallbacks.onToggle3D}
              is3DMode={false}
            />
          </Box>
          <Box
            sx={{
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Toolbar
              projectName="Nether Portal"
              layoutMode="quad"
              onNewProject={mockCallbacks.onNewProject}
              onSaveProject={mockCallbacks.onSaveProject}
              onOpenProject={mockCallbacks.onOpenProject}
              onLayoutModeChange={mockCallbacks.onLayoutModeChange}
              onToggle3D={mockCallbacks.onToggle3D}
              is3DMode={true}
            />
          </Box>
          <Box
            sx={{
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Toolbar
              projectName="Redstone Machine"
              layoutMode="tabbed"
              onNewProject={mockCallbacks.onNewProject}
              onSaveProject={mockCallbacks.onSaveProject}
              onOpenProject={mockCallbacks.onOpenProject}
              onLayoutModeChange={mockCallbacks.onLayoutModeChange}
              onToggle3D={mockCallbacks.onToggle3D}
              is3DMode={false}
            />
          </Box>
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
            {`interface ToolbarProps {
  projectName: string | null;       // Current project name (null if no project)
  onNewProject: () => void;         // New project callback
  onSaveProject: () => void;        // Save project callback
  onOpenProject: () => void;        // Open project callback
  onToggle3D: () => void;           // Toggle 3D mode callback
  is3DMode: boolean;                // Current view mode
}

// Save button is disabled when projectName is null
// Toggle button uses accent variant when is3DMode is true`}
          </pre>
        </Box>
      </Box>
    </Box>
  );
}
