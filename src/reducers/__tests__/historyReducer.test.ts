/**
 * historyReducer tests - undo and redo stacks folded from action:started markers
 */

import { describe, it, expect } from 'vitest';
import { foldHistory } from '../historyReducer';
import type { ActionStartedData, Event } from '../../core/EventLog';

let nextId = 1;
const marker = (actionId: string, data: ActionStartedData): Event => ({
  id: nextId++,
  type: 'action:started',
  data,
  timestamp: 0,
  projectId: 'p',
  actionId,
});
const edit = (actionId: string): Event => marker(actionId, { kind: 'paint', tool: 'point' });
const undo = (actionId: string, target: string): Event => marker(actionId, { kind: 'undo', target });
const redo = (actionId: string, target: string): Event => marker(actionId, { kind: 'redo', target });

describe('foldHistory', () => {
  it('stacks edits in order', () => {
    const state = foldHistory([edit('a'), edit('b')]);
    expect(state.undoStack).toEqual(['a', 'b']);
    expect(state.redoStack).toEqual([]);
    expect([...state.undone]).toEqual([]);
  });

  it('moves the newest edit to the redo stack on undo', () => {
    const state = foldHistory([edit('a'), edit('b'), undo('u1', 'b')]);
    expect(state.undoStack).toEqual(['a']);
    expect(state.redoStack).toEqual(['b']);
    expect([...state.undone]).toEqual(['b']);
  });

  it('restores the action on redo', () => {
    const state = foldHistory([edit('a'), undo('u1', 'a'), redo('r1', 'a')]);
    expect(state.undoStack).toEqual(['a']);
    expect(state.redoStack).toEqual([]);
    expect([...state.undone]).toEqual([]);
  });

  it('clears the redo stack on a new edit and keeps the discarded action undone', () => {
    const state = foldHistory([edit('a'), undo('u1', 'a'), edit('b')]);
    expect(state.undoStack).toEqual(['b']);
    expect(state.redoStack).toEqual([]);
    expect([...state.undone]).toEqual(['a']);
  });

  it('ignores an undo that does not target the newest action', () => {
    const state = foldHistory([edit('a'), edit('b'), undo('u1', 'a')]);
    expect(state.undoStack).toEqual(['a', 'b']);
    expect([...state.undone]).toEqual([]);
  });

  it('ignores a redo with nothing to redo', () => {
    const state = foldHistory([edit('a'), redo('r1', 'a')]);
    expect(state.undoStack).toEqual(['a']);
    expect(state.redoStack).toEqual([]);
  });
});
