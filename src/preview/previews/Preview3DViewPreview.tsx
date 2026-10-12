import React from 'react';
import { Box, Typography, Button, Stack } from "@mui/material";
import { Preview3DView } from "../../panels/Preview3DView";
import { createProjectCommand } from "../../commands/CreateProjectCommand";
import { projectView } from "../../projections/ProjectView";
import { blockProjection } from "../../projections/BlockProjection";
import { blockRegistry } from "../../core/BlockRegistry";
import type { Block, BlockData, Vector3D } from "../../types";

export function Preview3DViewPreview() {
  const [isInitialized, setIsInitialized] = React.useState(false);

  const handleInitialize = () => {
    createProjectCommand.execute("3D Preview Test", {
      width: 10,
      height: 10,
      depth: 10,
    });

    const blocks = blockRegistry.getAllBlocks();
    const isStone = (block: Block): boolean => block.category === "stone";
    const isWood = (block: Block): boolean => block.category === "wood";
    const stoneBlock = blocks.find(isStone)?.id || blocks[0]?.id;
    const woodBlock = blocks.find(isWood)?.id || blocks[1]?.id;

    const blocksToPlace: Array<{ position: Vector3D; blockType: string }> = [];

    if (stoneBlock) {
      for (let x = 2; x < 8; x++) {
        for (let y = 2; y < 8; y++) {
          blocksToPlace.push({ position: { x, y, z: 0 }, blockType: stoneBlock });
        }
      }

      for (let z = 1; z < 5; z++) {
        for (let x = 2; x < 8; x++) {
          blocksToPlace.push({ position: { x, y: 2, z }, blockType: stoneBlock });
          blocksToPlace.push({ position: { x, y: 7, z }, blockType: stoneBlock });
        }
        for (let y = 2; y < 8; y++) {
          blocksToPlace.push({ position: { x: 2, y, z }, blockType: stoneBlock });
          blocksToPlace.push({ position: { x: 7, y, z }, blockType: stoneBlock });
        }
      }
    }

    if (woodBlock) {
      blocksToPlace.push({ position: { x: 5, y: 2, z: 1 }, blockType: woodBlock });
      blocksToPlace.push({ position: { x: 5, y: 2, z: 2 }, blockType: woodBlock });
      blocksToPlace.push({ position: { x: 5, y: 2, z: 3 }, blockType: woodBlock });
    }

    if (blocksToPlace.length > 0) {
      // Writing blocks goes through DraftingService, which the gallery does not drive, so it only logs
      console.log('Preview: would place', blocksToPlace.length, 'blocks');
    }

    setIsInitialized(true);
  };

  const handleClear = async () => {
    const project = await projectView.getProject();
    if (project) {
      const allBlocks = (await blockProjection.getBlocks()).toArray();
      const toRemoval = (block: BlockData) => ({
        position: block.position,
        blockType: null,
        previousBlockType: block.blockType,
      });
      const blocksToRemove = allBlocks.map(toRemoval);
      if (blocksToRemove.length > 0) {
        console.log('Preview: would remove', blocksToRemove.length, 'blocks');
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">
        Preview3DView
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        BabylonJS 3D viewer with orbit camera controls. Use mouse to rotate
        (left drag), pan (right drag), and zoom (scroll).
      </Typography>

      <Stack spacing={2} sx={{ mt: 6 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button variant="contained" onClick={handleInitialize}>
            Initialize Sample Structure
          </Button>
          <Button
            variant="outlined"
            onClick={handleClear}
            disabled={!isInitialized}
          >
            Clear Blocks
          </Button>
          {!isInitialized && (
            <Typography variant="body2" color="text.secondary">
              Click "Initialize" to create a sample structure
            </Typography>
          )}
        </Box>

        <Box
          sx={{ width: 800, height: 600, border: 1, borderColor: "grey.300" }}
        >
          <Preview3DView />
        </Box>

        <Typography variant="caption" color="text.secondary">
          Coordinate System: Z-up (our system) → Y-up (Babylon)
        </Typography>
      </Stack>
    </Box>
  );
}
