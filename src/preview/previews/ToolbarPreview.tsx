import { Box, Typography } from '@mui/material';
import { Toolbar } from '../../layouts/Toolbar';
import { mockCallbacks } from '../mockData';

/**
 * Preview showcase for the Toolbar component
 * Demonstrates toolbar with and without active project
 */
export function ToolbarPreview() {
  return (
    <Box>
      <Typography variant="h4" component="h1">Toolbar</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Application header with project name, save status indicator, and view mode selector.
      </Typography>

      {/* No Project Active */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">No Active Project</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Toolbar state when no project is loaded. The save status indicator is hidden.
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
            saveState="saved"
            onBackToProjects={mockCallbacks.onBackToProjects}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
          />
        </Box>
      </Box>

      {/* Save States */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Save Status Indicators</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Visual indicators showing the current autosave state of the project.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Saved - All changes saved to browser</Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'grey.300',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <Toolbar
                projectName="Saved Project"
                layoutMode="tabbed"
                saveState="saved"
                onBackToProjects={mockCallbacks.onBackToProjects}
                onLayoutModeChange={mockCallbacks.onLayoutModeChange}
                onToggle3D={mockCallbacks.onToggle3D}
                is3DMode={false}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Pending - Unsaved changes (autosave will trigger in 3 seconds)</Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'grey.300',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <Toolbar
                projectName="Project With Changes"
                layoutMode="tabbed"
                saveState="pending"
                onBackToProjects={mockCallbacks.onBackToProjects}
                onLayoutModeChange={mockCallbacks.onLayoutModeChange}
                onToggle3D={mockCallbacks.onToggle3D}
                is3DMode={false}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Saving - Currently saving to browser (minimum 1.5s visible)</Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'grey.300',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <Toolbar
                projectName="Saving Project"
                layoutMode="tabbed"
                saveState="saving"
                onBackToProjects={mockCallbacks.onBackToProjects}
                onLayoutModeChange={mockCallbacks.onLayoutModeChange}
                onToggle3D={mockCallbacks.onToggle3D}
                is3DMode={false}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* With Project */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Active Project</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Toolbar with an active project named "Sample House".
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
            saveState="saved"
            onBackToProjects={mockCallbacks.onBackToProjects}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
          />
        </Box>
      </Box>

      {/* With Project - Quad Layout */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Active Project - Quad Layout Mode</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Toolbar with quad layout mode selected (four-panel view).
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
            saveState="saved"
            onBackToProjects={mockCallbacks.onBackToProjects}
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
            saveState="pending"
            onBackToProjects={mockCallbacks.onBackToProjects}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
          />
        </Box>
      </Box>

      {/* Interactive Demo */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click buttons to test interactions. Check console for callback logs.
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
            saveState="saving"
            onBackToProjects={mockCallbacks.onBackToProjects}
            onLayoutModeChange={mockCallbacks.onLayoutModeChange}
          />
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
              saveState="saved"
              onBackToProjects={mockCallbacks.onBackToProjects}
              onLayoutModeChange={mockCallbacks.onLayoutModeChange}
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
              saveState="saved"
              onBackToProjects={mockCallbacks.onBackToProjects}
              onLayoutModeChange={mockCallbacks.onLayoutModeChange}
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
              saveState="saved"
              onBackToProjects={mockCallbacks.onBackToProjects}
              onLayoutModeChange={mockCallbacks.onLayoutModeChange}
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
  layoutMode: LayoutMode;           // Current layout mode ('tabbed' | 'quad')
  saveState: SaveState;             // Save status ('saved' | 'pending' | 'saving')
  onBackToProjects: () => void;     // Navigate back to project list
  onLayoutModeChange: (mode: LayoutMode) => void; // View mode selector callback
}

// Save status indicator shows next to project title
// Indicator is hidden when projectName is null`}
          </pre>
        </Box>
      </Box>
    </Box>
  );
}
