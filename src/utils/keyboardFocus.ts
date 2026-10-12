/**
 * Keyboard guards for window-level key handlers
 *
 * Window listeners see every key, including keys pressed inside a modal dialog. The dialog makes
 * the page inert to focus and pointer input, but key events still bubble to window.
 */

/**
 * True when the key goes to a text field, where it types instead of acting as a shortcut
 */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === true
    || target.closest('[contenteditable="true"]') !== null;
};

/**
 * True while a modal dialog is open. Editor shortcuts stay off until it closes.
 */
export const isModalOpen = (): boolean => document.querySelector('dialog[open]') !== null;
