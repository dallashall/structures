import React from 'react';

import type { SaveState } from '../core/SaveTracker';

import { saveTracker } from '../core/SaveTracker';

const increment = (count: number): number => count + 1;

/**
 * Props injected by withSaveState HOC
 */
export interface WithSaveStateProps {
  saveState: SaveState;
}

/**
 * HOC that bridges SaveTracker to React re-renders.
 * The state is read from the singleton on every render. Events only trigger the re-render.
 */
export function withSaveState<P extends object>(
  Component: React.ComponentType<P & WithSaveStateProps>,
) {
  return function WithSaveState(props: P) {
    const [, rerender] = React.useReducer(increment, 0);

    React.useEffect(() => {
      saveTracker.on('save:started', rerender);
      saveTracker.on('save:completed', rerender);
      saveTracker.on('save:failed', rerender);
      return () => {
        saveTracker.off('save:started', rerender);
        saveTracker.off('save:completed', rerender);
        saveTracker.off('save:failed', rerender);
      };
    }, []);

    return <Component {...props} saveState={saveTracker.getSaveState()} />;
  };
}
