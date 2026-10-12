import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { NewProjectDialog } from '../../components/NewProjectDialog';
import type { Dimensions } from '../../types';

export function NewProjectDialogPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ name: string; dimensions: Dimensions } | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCreate = (name: string, dimensions: Dimensions) => {
    setLastCreated({ name, dimensions });
    setIsOpen(false);
    console.log('[Preview] Project created:', name, dimensions);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">NewProjectDialog</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Dialog for creating new projects with customizable dimensions. Supports
        presets (Small, Medium, Large) and custom sizes.
      </Typography>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2">Interactive Demo</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click the button to open the New Project dialog. Test the presets
          and custom dimension inputs.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Open New Project Dialog
        </Button>

        {lastCreated && (
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, border: 1, borderColor: 'grey.300', mt: 3 }}>
            <Typography variant="h6" component="h4">Last Created Project</Typography>
            <Typography variant="body1">
              <strong>Name:</strong> {lastCreated.name}
              <br />
              <strong>Dimensions:</strong> {lastCreated.dimensions.width} ×{' '}
              {lastCreated.dimensions.height} × {lastCreated.dimensions.depth}
            </Typography>
          </Box>
        )}

        <NewProjectDialog
          isOpen={isOpen}
          onClose={handleClose}
          onCreate={handleCreate}
        />
      </Box>

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
            {`interface NewProjectDialogProps {
  isOpen: boolean;                          // Dialog visibility state
  onClose: () => void;                      // Close callback (cancel)
  onCreate: (name: string, dimensions: Dimensions) => void;  // Create callback
}

interface Dimensions {
  width: number;    // 1-256
  height: number;   // 1-256
  depth: number;    // 1-256
}

// Presets:
// - Small: 16×16×16
// - Medium: 32×32×32
// - Large: 64×64×64
// - Custom: User-defined`}
          </pre>
        </Box>
      </Box>

      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3">Features</Typography>
        <Typography variant="body1" component="div">
          <ul>
            <li>Required project name field with validation</li>
            <li>Dimension presets for quick setup</li>
            <li>Custom dimensions with min/max validation (1-256)</li>
            <li>Form reset on cancel or successful creation</li>
            <li>Create button disabled when name is empty</li>
            <li>Note reminding users dimensions can be changed later</li>
          </ul>
        </Typography>
      </Box>
    </Box>
  );
}
