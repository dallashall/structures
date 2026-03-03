import { Box, Typography } from '@mui/material';
import type { ProjectMetadata } from '../types';

interface ProjectCardProps {
  project: ProjectMetadata;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * ProjectCard - Individual project card in grid
 *
 * Displays a project thumbnail and name in a clickable card format.
 */
export function ProjectCard({ project, isSelected, onClick }: ProjectCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: isSelected ? 3 : 1,
        borderColor: isSelected ? 'primary.main' : 'grey.300',
        borderRadius: 1,
        p: 1,
        bgcolor: 'grey.50',
        '&:hover': {
          borderColor: 'primary.light',
        },
      }}
    >
      {/* Thumbnail */}
      <Box
        sx={{
          bgcolor: 'grey.200',
          height: 160,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
        }}
      >
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No thumbnail
          </Typography>
        )}
      </Box>

      {/* Project Name */}
      <Typography variant="h6" sx={{ mt: 1 }}>
        {project.name}
      </Typography>
    </Box>
  );
}
