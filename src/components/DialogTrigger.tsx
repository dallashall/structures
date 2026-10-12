import React from 'react';
import { Popover } from "@mui/material";

import { withDisclosureState } from "../hocs/withDisclosureState";
import type { WithDisclosureStateProps } from "../hocs/withDisclosureState";

interface DialogTriggerOwnProps {
  type: "modal" | "popover";
  /** [trigger element, render function that receives close] */
  children: [React.ReactElement, (close: () => void) => React.ReactElement];
}

/**
 * Opens an overlay from a trigger element. withDisclosureState holds the open state.
 * A modal renders the content as given. A popover wraps it in an MUI Popover anchored to the trigger.
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

  const trigger = React.cloneElement(triggerElement, {
    onClick: onOpen,
  });

  const dialog = dialogRenderFn(onClose);

  if (type === "modal") {
    return (
      <>
        {trigger}
        {isOpen && dialog}
      </>
    );
  } else {
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
