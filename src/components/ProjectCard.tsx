import { Box, Typography } from '@mui/material';
import type { StorageMetadata } from '../types';

interface ProjectCardProps {
  project: StorageMetadata;
  isSelected: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, isSelected, onClick }: ProjectCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: isSelected ? 3 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderRadius: 1,
        p: 1,
        bgcolor: 'background.paper',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: 1,
        },
      }}
    >
      <Box
        sx={{
          bgcolor: 'action.hover',
          height: 160,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          overflow: 'hidden',
        }}
      >
        {project.thumbnail ? (
          <Box
            component="img"
            src={project.thumbnail}
            alt={project.name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No thumbnail
          </Typography>
        )}
      </Box>

      <Typography variant="h6" sx={{ mt: 1 }}>
        {project.name}
      </Typography>
    </Box>
  );
}
