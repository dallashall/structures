import React from 'react';
import { Popover } from "@mui/material";

import { withDisclosureState } from "../hocs/withDisclosureState";
import type { WithDisclosureStateProps } from "../hocs/withDisclosureState";

interface DialogTriggerOwnProps {
  /** Type of overlay */
  type: "modal" | "popover";
  /** Children: [trigger element, dialog render function] */
  children: [React.ReactElement, (close: () => void) => React.ReactElement];
}

/**
 * DialogTrigger - Pattern for triggering dialogs/popovers from a button
 *
 * withDisclosureState holds the open state. The dialog render function receives the close function.
 * Supports both modal dialogs and popover dialogs.
 *
 * Usage:
 * <DialogTrigger type="modal">
 *   <Button>Open</Button>
 *   {(close) => <Dialog open onClose={close}>...</Dialog>}
 * </DialogTrigger>
 */
function DialogTriggerComponent({
  type,
  children,
  anchorEl,
  onOpen,
  onClose,
}: DialogTriggerOwnProps & WithDisclosureStateProps) {
  const isOpen = anchorEl !== null;
  const [triggerElement, dialogRenderFn] = children;

  // Clone trigger element and add onClick handler
  const trigger = React.cloneElement(triggerElement, {
    onClick: onOpen,
  });

  // Render dialog with close function
  const dialog = dialogRenderFn(onClose);

  if (type === "modal") {
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
          onClose={onClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
        >
          {dialog}
        </Popover>
      </>
    );
  }
}

export const DialogTrigger = withDisclosureState<DialogTriggerOwnProps>(DialogTriggerComponent);
