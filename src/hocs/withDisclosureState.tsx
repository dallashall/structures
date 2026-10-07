import React from 'react';

/**
 * Props injected by withDisclosureState HOC
 */
export interface WithDisclosureStateProps {
  // Element the overlay opened from. Null while closed.
  anchorEl: HTMLElement | null;
  onOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}

/**
 * HOC that holds open/closed state for a popover or dialog.
 * The state is local to one overlay instance and no other part of the app reads it.
 */
export function withDisclosureState<P extends object>(
  Component: React.ComponentType<P & WithDisclosureStateProps>,
) {
  return function WithDisclosureState(props: P) {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const handleOpen = (event: React.MouseEvent<HTMLElement>): void => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = (): void => {
      setAnchorEl(null);
    };

    return <Component {...props} anchorEl={anchorEl} onOpen={handleOpen} onClose={handleClose} />;
  };
}
