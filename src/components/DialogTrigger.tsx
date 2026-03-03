import React from 'react';
import { Popover } from '@mui/material';

interface DialogTriggerProps {
  /** Type of overlay */
  type: 'modal' | 'popover';
  /** Children: [trigger element, dialog render function] */
  children: [
    React.ReactElement,
    (close: () => void) => React.ReactElement
  ];
}

/**
 * DialogTrigger - Pattern for triggering dialogs/popovers from a button
 *
 * Manages open/close state internally and provides a close function to the dialog.
 * Supports both modal dialogs and popover dialogs.
 *
 * Usage:
 * <DialogTrigger type="modal">
 *   <Button>Open</Button>
 *   {(close) => <Dialog open onClose={close}>...</Dialog>}
 * </DialogTrigger>
 */
export function DialogTrigger({ type, children }: DialogTriggerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const [triggerElement, dialogRenderFn] = children;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setIsOpen(true);
    if (type === 'popover') {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setAnchorEl(null);
  };

  // Clone trigger element and add onClick handler
  const trigger = React.cloneElement(triggerElement, {
    onClick: handleOpen,
  });

  // Render dialog with close function
  const dialog = dialogRenderFn(handleClose);

  if (type === 'modal') {
    // For modal dialogs, wrap in MUI Dialog
    return (
      <>
        {trigger}
        {isOpen && dialog}
      </>
    );
  } else {
    // For popovers, wrap in MUI Popover
    return (
      <>
        {trigger}
        <Popover
          open={isOpen}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          {dialog}
        </Popover>
      </>
    );
  }
}
