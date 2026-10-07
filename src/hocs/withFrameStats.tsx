import React from 'react';

import type { FrameStatsReport } from '../core/FrameStats';

import { frameStats } from '../core/FrameStats';

/**
 * Props injected by withFrameStats HOC
 */
export interface WithFrameStatsProps {
  stats: FrameStatsReport | null;
}

/**
 * HOC that passes the latest frame stats summary. Re-renders twice a second while mounted.
 */
export function withFrameStats<P extends object>(
  Component: React.ComponentType<P & WithFrameStatsProps>,
) {
  return function WithFrameStats(props: P) {
    const [stats, setStats] = React.useState<FrameStatsReport | null>(frameStats.getLatest());

    React.useEffect(() => {
      frameStats.on('framestats:sampled', setStats);
      return () => frameStats.off('framestats:sampled', setStats);
    }, []);

    return <Component {...props} stats={stats} />;
  };
}
