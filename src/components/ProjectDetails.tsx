import { Box, Button, Stack, Typography } from '@mui/material';
import { Delete, DriveFileRenameOutline, OpenInNew } from '@mui/icons-material';

import type { StorageMetadata } from '../types';

import { ProjectNameForm } from './ProjectNameForm';

interface ProjectDetailsProps {
  project: StorageMetadata;
  isRenaming: boolean;
  renameError: string | null;
  onOpen: () => void;
  onDelete: () => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRename: (name: string) => void;
}

export function ProjectDetails({
  project,
  isRenaming,
  renameError,
  onOpen,
  onDelete,
  onStartRename,
  onCancelRename,
  onRename,
}: ProjectDetailsProps) {
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        {isRenaming ? (
          <ProjectNameForm
            key={project.id}
            name={project.name}
            error={renameError}
            onSubmit={onRename}
            onCancel={onCancelRename}
          />
        ) : (
          <Typography variant="h6">{project.name}</Typography>
        )}
        <Typography variant="body2">
          Created: {project.created.toLocaleDateString()}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={<OpenInNew />} onClick={onOpen}>
            Open
          </Button>
          <Button startIcon={<DriveFileRenameOutline />} onClick={onStartRename} disabled={isRenaming}>
            Rename
          </Button>
          <Button color="error" startIcon={<Delete />} onClick={onDelete}>
            Delete
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
