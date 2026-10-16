import React from 'react';

import type { ColorScheme } from '../config/colorSchemes';
import type { ThemeChoice } from '../core/ThemePreference';

import { themePreference } from '../core/ThemePreference';

const increment = (count: number): number => count + 1;

export interface WithThemePreferenceProps {
  themeChoice: ThemeChoice;
  colorScheme: ColorScheme;
  onThemeChoiceSelect: (choice: ThemeChoice) => void;
}

/**
 * HOC that bridges the ThemePreference singleton to React re-renders.
 * Props are read from the singleton on every render. Events only trigger the re-render.
 */
export function withThemePreference<P extends object>(
  Component: React.ComponentType<P & WithThemePreferenceProps>,
) {
  return function WithThemePreference(props: P) {
    const [, rerender] = React.useReducer(increment, 0);

    const subscribe = (): (() => void) => {
      themePreference.on('themechoice:selected', rerender);
      themePreference.on('colorscheme:switched', rerender);
      // The scheme can flip between the first render and this subscription
      rerender();
      const unsubscribe = (): void => {
        themePreference.off('themechoice:selected', rerender);
        themePreference.off('colorscheme:switched', rerender);
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    return (
      <Component
        {...props}
        themeChoice={themePreference.getChoice()}
        colorScheme={themePreference.getScheme()}
        onThemeChoiceSelect={themePreference.selectChoice}
      />
    );
  };
}
