import React from 'react';
import { storage, SaveState } from "../core/Storage";

/**
 * Props injected by withStorageState HOC
 */
export interface WithStorageStateProps {
  saveState: SaveState;
}

/**
 * HOC that provides storage/save state to wrapped component
 *
 * Subscribes to StorageManager events and passes save state as props.
 * Save state can be:
 * - 'saved' - All changes have been saved
 * - 'pending' - Changes are waiting to be saved (debounce delay)
 * - 'saving' - Currently saving to storage
 */
export function withStorageState<P extends object>(
  Component: React.ComponentType<P & WithStorageStateProps>,
) {
  return function WithStorageState(props: P) {
    const [saveState, setSaveState] = React.useState<SaveState>(
      storage.getSaveState(),
    );

    React.useEffect(() => {
      const handleStateChanged = (event: Event) => {
        const customEvent = event as CustomEvent<{ saveState: SaveState }>;
        setSaveState(customEvent.detail.saveState);
      };

      // Listen to window custom event instead of EventEmitter
      window.addEventListener("save:state-changed", handleStateChanged);

      return () => {
        window.removeEventListener("save:state-changed", handleStateChanged);
      };
    }, []);

    return <Component {...props} saveState={saveState} />;
  };
}
