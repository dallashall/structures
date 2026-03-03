import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { ProjectMetadata } from '../types';

interface ProjectMetadataPanelProps {
  project: ProjectMetadata;
  onOpen: () => void;
  onDelete: () => void;
}

/**
 * ProjectMetadataPanel - Shows detailed info for selected project
 *
 * Displays project metadata and provides actions to open or delete the project.
 */
export function ProjectMetadataPanel({
  project,
  onOpen,
  onDelete,
}: ProjectMetadataPanelProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    onDelete();
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          bgcolor: 'grey.100',
          borderRadius: 1,
          p: 2,
          border: 1,
          borderColor: 'grey.300',
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h5">{project.name}</Typography>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Created:</strong> {project.created.toLocaleDateString()}
            </Typography>
            <Typography variant="body2">
              <strong>Modified:</strong> {project.modified.toLocaleDateString()}
            </Typography>
            <Typography variant="body2">
              <strong>Dimensions:</strong> {project.dimensions.width} ×{' '}
              {project.dimensions.height} × {project.dimensions.depth}
            </Typography>
            <Typography variant="body2">
              <strong>Blocks:</strong> {project.blockCount}
            </Typography>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Button variant="contained" onClick={onOpen}>
              Open Project
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteClick}
              startIcon={<Delete />}
            >
              Delete Project
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete &quot;{project.name}&quot;? This action cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
