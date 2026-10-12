import React from 'react';

import type { AtlasStatus } from '../core/TextureResolver';

import { textureResolver } from '../core/TextureResolver';

const increment = (count: number): number => count + 1;

export interface WithAtlasStatusProps {
  atlasStatus: AtlasStatus;
}

/**
 * HOC that bridges TextureResolver's atlas load result to React re-renders.
 * The status is read from the singleton on every render. Events only trigger the re-render.
 */
export function withAtlasStatus<P extends object>(
  Component: React.ComponentType<P & WithAtlasStatusProps>,
) {
  return function WithAtlasStatus(props: P) {
    const [, rerender] = React.useReducer(increment, 0);

    const subscribe = (): (() => void) => {
      textureResolver.on('atlas:ready', rerender);
      textureResolver.on('atlas:error', rerender);
      // The load can settle between the first render and this subscription
      rerender();
      const unsubscribe = (): void => {
        textureResolver.off('atlas:ready', rerender);
        textureResolver.off('atlas:error', rerender);
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    return <Component {...props} atlasStatus={textureResolver.getAtlasStatus()} />;
  };
}
