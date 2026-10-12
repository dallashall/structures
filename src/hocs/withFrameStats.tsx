import React from 'react';

import type { FrameStatsReport } from '../core/FrameStats';

import { frameStats } from '../core/FrameStats';

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

    const subscribe = (): (() => void) => {
      frameStats.on('framestats:sampled', setStats);
      const unsubscribe = (): void => { frameStats.off('framestats:sampled', setStats); };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    return <Component {...props} stats={stats} />;
  };
}
