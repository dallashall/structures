import React from 'react';

import { editHistory } from '../core/EditHistory';

/**
 * Props injected by withEditHistory HOC
 */
export interface WithEditHistoryProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const HISTORY_NOTIFICATIONS = [
  'history:replayed',
  'history:step-recorded',
  'history:step-undone',
  'history:step-redone',
];

const handleUndo = (): void => {
  void editHistory.undo();
};

const handleRedo = (): void => {
  void editHistory.redo();
};

/**
 * HOC that passes whether undo and redo are available, and callbacks that run them
 */
export function withEditHistory<P extends object>(
  Component: React.ComponentType<P & WithEditHistoryProps>,
) {
  return function WithEditHistory(props: P) {
    const [canUndo, setCanUndo] = React.useState(editHistory.canUndo());
    const [canRedo, setCanRedo] = React.useState(editHistory.canRedo());

    const subscribe = (): (() => void) => {
      const readStacks = (): void => {
        setCanUndo(editHistory.canUndo());
        setCanRedo(editHistory.canRedo());
      };
      const subscribe = (name: string): void => { editHistory.on(name, readStacks); };
      const unsubscribe = (name: string): void => { editHistory.off(name, readStacks); };

      const unsubscribeAll = (): void => HISTORY_NOTIFICATIONS.forEach(unsubscribe);

      HISTORY_NOTIFICATIONS.forEach(subscribe);
      readStacks();
      return unsubscribeAll;
    };
    React.useEffect(subscribe, []);

    return (
      <Component
        {...props}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    );
  };
}
