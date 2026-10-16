import type React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

/**
 * Menu props for any MUI Select inside a ModalDialog.
 * MUI portals menus to <body>, and a modal <dialog> makes everything outside it inert and draws
 * above it in the top layer. A portaled menu would open behind the dialog and ignore input.
 */
export const IN_DIALOG_MENU_PROPS = { disablePortal: true } as const;

// Element inside the dialog that takes focus when it opens. React renders no autofocus attribute.
const AUTOFOCUS_SELECTOR = '[data-autofocus]';

// A menu or popover rendered in place by IN_DIALOG_MENU_PROPS. MUI closes it on Escape
// without preventDefault, so the same Escape also sends cancel to the dialog.
const NESTED_POPUP_SELECTOR = '.MuiModal-root';

const WIDTHS = { xs: 444, sm: 600, md: 900 };

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  // ID of the element that names the dialog, usually its DialogTitle
  labelledBy: string;
  maxWidth?: keyof typeof WIDTHS;
  // Width of maxWidth on any screen wide enough, instead of shrinking to the content
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
  children: React.ReactNode;
}

/**
 * Open or close the native dialog to match `open`.
 *
 * A new callback on every render makes React call it with the element after each render,
 * so the dialog follows `open` without an effect. showModal() traps Tab inside the dialog,
 * makes the rest of the page inert, and focuses the [data-autofocus] element, or else the
 * first focusable one. close() returns focus to the element that had it before.
 */
const syncDialog = (open: boolean) => (dialog: HTMLDialogElement | null): void => {
  if (!dialog) return;
  if (open && !dialog.open) {
    dialog.showModal();
    dialog.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR)?.focus();
  } else if (!open && dialog.open) {
    dialog.close();
  }
};

/**
 * A native modal <dialog> styled like an MUI paper. The browser handles the focus trap, inert background, focus restore, and Escape.
 * Escape and a press on the backdrop call onClose, and the parent decides whether to close.
 * Children mount only while open, so a closed dialog costs no rendering.
 */
export function ModalDialog({ open, onClose, labelledBy, maxWidth = 'sm', fullWidth = false, sx, children }: ModalDialogProps) {
  // Escape fires cancel and would close the dialog on its own. The parent's open prop stays in charge.
  // An Escape that closes a nested menu closes only the menu: React has not removed it from the DOM yet.
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    if (event.currentTarget.querySelector(NESTED_POPUP_SELECTOR)) return;
    onClose();
  };

  // The dialog has no padding, so a press lands on the dialog element itself only on its backdrop
  const handleMouseDown = (event: React.MouseEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <Box
      component="dialog"
      ref={syncDialog(open)}
      aria-labelledby={labelledBy}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      sx={[
        {
          p: 0,
          border: 'none',
          borderRadius: 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 24,
          width: fullWidth ? `calc(100% - 64px)` : 'auto',
          maxWidth: WIDTHS[maxWidth],
          maxHeight: 'calc(100% - 64px)',
          overflow: 'hidden',
          '&[open]': { display: 'flex', flexDirection: 'column' },
          '&::backdrop': { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {open && children}
    </Box>
  );
}
