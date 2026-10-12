import { Box, Link, Stack, Typography } from '@mui/material';

import type { Credit } from '../config/credits';

interface CreditSectionProps {
  heading: string;
  credits: Credit[];
}

/**
 * CreditSection - One group of credits: title, author, license link, and source link per work
 */
export function CreditSection({ heading, credits }: CreditSectionProps) {
  const renderCredit = (credit: Credit) => (
    <Box key={credit.title}>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {credit.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        by {credit.author} ·{' '}
        <Link href={credit.license.url} target="_blank" rel="noopener noreferrer">
          {credit.license.label}
        </Link>{' '}
        ·{' '}
        <Link href={credit.source.url} target="_blank" rel="noopener noreferrer">
          {credit.source.label}
        </Link>
      </Typography>
      {credit.note && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          {credit.note}
        </Typography>
      )}
    </Box>
  );

  return (
    <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary">
        {heading}
      </Typography>
      {credits.map(renderCredit)}
    </Stack>
  );
}
