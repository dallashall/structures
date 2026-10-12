/**
 * keyboardFocus tests - which keys window-level shortcut handlers must leave alone
 */

import { describe, it, expect, afterEach } from 'vitest';
import { isModalOpen, isTypingTarget } from '../keyboardFocus';

describe('isTypingTarget', () => {
  it('is true for text fields and editable content', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.append(editable);

    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(editable)).toBe(true);
    editable.remove();
  });

  it('is false for buttons, the window, and no target', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('isModalOpen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is true only while a dialog is open', () => {
    const dialog = document.createElement('dialog');
    document.body.append(dialog);
    expect(isModalOpen()).toBe(false);

    dialog.setAttribute('open', '');
    expect(isModalOpen()).toBe(true);
  });
});
