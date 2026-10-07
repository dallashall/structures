import { Box, Typography } from '@mui/material';

import { withFrameStats } from '../hocs/withFrameStats';
import type { WithFrameStatsProps } from '../hocs/withFrameStats';

const ms = (value: number): string => value.toFixed(1);

/**
 * FrameStatsOverlay - Frame timing and camera smoothness for the 3D view, over the last 120 frames
 *
 * frame: interval between frames (p50 / p95 / worst). render: CPU time in scene.render().
 * tick: CPU time of the whole frame loop, every 2D view included. 3D buffer: drawing size in device pixels.
 * long: frames over 1.5x the median interval. jitter: unevenness of camera steps while moving.
 */
function FrameStatsOverlayComponent({ stats }: WithFrameStatsProps) {
  const lines = stats
    ? [
        `${stats.fps.toFixed(1)} fps`,
        `frame ${ms(stats.intervalP50)} / ${ms(stats.intervalP95)} / ${ms(stats.intervalMax)} ms`,
        `render ${ms(stats.renderMean)} avg, ${ms(stats.renderP95)} p95 ms`,
        `tick ${ms(stats.tickMean)} avg, ${ms(stats.tickP95)} p95 ms`,
        `3D buffer ${stats.bufferWidth}×${stats.bufferHeight}`,
        `long ${stats.longFrames} / ${stats.frames}`,
        `jitter ${stats.cameraJitter === null ? '-' : stats.cameraJitter.toFixed(2)}`,
      ]
    : ['measuring...'];

  const renderLine = (line: string) => (
    <Typography key={line} variant="caption" component="div" sx={{ fontFamily: '"Red Hat Mono", monospace', lineHeight: 1.4 }}>
      {line}
    </Typography>
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 44,
        left: 8,
        zIndex: 10,
        pointerEvents: 'none',
        bgcolor: 'rgba(0, 0, 0, 0.6)',
        color: 'grey.100',
        px: 1,
        py: 0.5,
        borderRadius: 1,
      }}
    >
      {lines.map(renderLine)}
    </Box>
  );
}

export const FrameStatsOverlay = withFrameStats<object>(FrameStatsOverlayComponent);
