import React from 'react';

import type { Screen } from '../core/ScreenRouter';

import { screenRouter } from '../core/ScreenRouter';

const increment = (count: number): number => count + 1;

export interface WithScreenStateProps {
  screen: Screen;
  isNewProjectDialogOpen: boolean;
  isCreditsDialogOpen: boolean;
  fileError: string | null;
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

    const subscribe = (): (() => void) => {
      screenRouter.on('screen:shown', rerender);
      screenRouter.on('newprojectdialog:toggled', rerender);
      screenRouter.on('creditsdialog:toggled', rerender);
      screenRouter.on('file-error:shown', rerender);
      screenRouter.on('file-error:dismissed', rerender);
      const unsubscribe = (): void => {
        screenRouter.off('screen:shown', rerender);
        screenRouter.off('newprojectdialog:toggled', rerender);
        screenRouter.off('creditsdialog:toggled', rerender);
        screenRouter.off('file-error:shown', rerender);
        screenRouter.off('file-error:dismissed', rerender);
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    return (
      <Component
        {...props}
        screen={screenRouter.getScreen()}
        isNewProjectDialogOpen={screenRouter.isNewProjectDialogOpen()}
        isCreditsDialogOpen={screenRouter.isCreditsDialogOpen()}
        fileError={screenRouter.getFileError()}
      />
    );
  };
}
