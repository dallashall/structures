import React from 'react';

import type { Screen } from '../core/ScreenRouter';

import { screenRouter } from '../core/ScreenRouter';

const increment = (count: number): number => count + 1;

/**
 * Props injected by withScreenState HOC
 */
export interface WithScreenStateProps {
  screen: Screen;
  isNewProjectDialogOpen: boolean;
}

/**
 * HOC that bridges the ScreenRouter singleton to React re-renders.
 * Props are read from the singleton on every render. Events only trigger the re-render.
 */
export function withScreenState<P extends object>(
  Component: React.ComponentType<P & WithScreenStateProps>,
) {
  return function WithScreenState(props: P) {
    const [, rerender] = React.useReducer(increment, 0);

    React.useEffect(() => {
      screenRouter.on('screen:shown', rerender);
      screenRouter.on('newprojectdialog:toggled', rerender);
      return () => {
        screenRouter.off('screen:shown', rerender);
        screenRouter.off('newprojectdialog:toggled', rerender);
      };
    }, []);

    return (
      <Component
        {...props}
        screen={screenRouter.getScreen()}
        isNewProjectDialogOpen={screenRouter.isNewProjectDialogOpen()}
      />
    );
  };
}
