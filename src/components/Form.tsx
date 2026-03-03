import React from 'react';
import { Box } from '@mui/material';

interface FormProps {
  /** Form content */
  children: React.ReactNode;
  /** Form submit handler */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Form - Semantic form container with consistent spacing
 *
 * Provides a form element with consistent gap spacing between child elements
 * using MUI spacing tokens.
 */
export function Form({ children, onSubmit }: FormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (onSubmit) {
      onSubmit(event);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2, // 16px spacing
      }}
    >
      {children}
    </Box>
  );
}
