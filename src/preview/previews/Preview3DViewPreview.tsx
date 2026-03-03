import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Preview3DView } from '../../panels/Preview3DView';
import { projectManager } from '../../core/ProjectManager';
import { blockRegistry } from '../../core/BlockRegistry';

/**
 * Preview3DView Preview
 *
 * Demonstrates the BabylonJS 3D viewer with a sample structure
 */
export function Preview3DViewPreview() {
  const [isInitialized, setIsInitialized] = React.useState(false);

  const handleInitialize = () => {
    // Create a sample project
    projectManager.createProject('3D Preview Test', {
      width: 10,
      height: 10,
      depth: 10,
    });

    // Get a few block types
    const blocks = blockRegistry.getAllBlocks();
    const stoneBlock = blocks.find((b) => b.category === 'stone')?.id || blocks[0]?.id;
    const woodBlock = blocks.find((b) => b.category === 'wood')?.id || blocks[1]?.id;

    // Add some sample blocks to create a simple structure
    if (stoneBlock) {
      // Create a floor
      for (let x = 2; x < 8; x++) {
        for (let y = 2; y < 8; y++) {
          projectManager.setBlock({ x, y, z: 0 }, stoneBlock);
        }
      }

      // Create walls
      for (let z = 1; z < 5; z++) {
        // Front and back walls
        for (let x = 2; x < 8; x++) {
          projectManager.setBlock({ x, y: 2, z }, stoneBlock);
          projectManager.setBlock({ x, y: 7, z }, stoneBlock);
        }
        // Left and right walls
        for (let y = 2; y < 8; y++) {
          projectManager.setBlock({ x: 2, y, z }, stoneBlock);
          projectManager.setBlock({ x: 7, y, z }, stoneBlock);
        }
      }
    }

    if (woodBlock) {
      // Add a wooden door frame
      projectManager.setBlock({ x: 5, y: 2, z: 1 }, woodBlock);
      projectManager.setBlock({ x: 5, y: 2, z: 2 }, woodBlock);
      projectManager.setBlock({ x: 5, y: 2, z: 3 }, woodBlock);
    }

    setIsInitialized(true);
  };

  const handleClear = () => {
    const project = projectManager.getProject();
    if (project) {
      const blocks = projectManager.getAllBlocks();
      blocks.forEach((block) => {
        projectManager.removeBlock(block.position);
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">Preview3DView</Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        BabylonJS 3D viewer with orbit camera controls. Use mouse to rotate (left drag), pan (right drag), and zoom (scroll).
      </Typography>

      <Stack spacing={2} sx={{ mt: 6 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant="contained" onClick={handleInitialize}>
            Initialize Sample Structure
          </Button>
          <Button variant="outlined" onClick={handleClear} disabled={!isInitialized}>
            Clear Blocks
          </Button>
          {!isInitialized && (
            <Typography variant="body2" color="text.secondary">
              Click "Initialize" to create a sample structure
            </Typography>
          )}
        </Box>

        <Box sx={{ width: 800, height: 600, border: 1, borderColor: 'grey.300' }}>
          <Preview3DView width={800} height={600} />
        </Box>

        <Typography variant="caption" color="text.secondary">
          Coordinate System: Z-up (our system) → Y-up (Babylon)
        </Typography>
      </Stack>
    </Box>
  );
}
