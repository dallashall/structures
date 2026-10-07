import React from 'react';

import type { FrameStatsSummary } from '../utils/frameStats';

import { frameStats } from '../core/FrameStats';

/**
 * Props injected by withFrameStats HOC
 */
export interface WithFrameStatsProps {
  stats: FrameStatsSummary | null;
}

/**
 * HOC that passes the latest frame stats summary. Re-renders twice a second while mounted.
 */
export function withFrameStats<P extends object>(
  Component: React.ComponentType<P & WithFrameStatsProps>,
) {
  return function WithFrameStats(props: P) {
    const [stats, setStats] = React.useState<FrameStatsSummary | null>(frameStats.getLatest());

    React.useEffect(() => {
      frameStats.on('framestats:sampled', setStats);
      return () => frameStats.off('framestats:sampled', setStats);
    }, []);

    return <Component {...props} stats={stats} />;
  };
}
