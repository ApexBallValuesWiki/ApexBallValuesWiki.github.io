/**
 * Undo/Redo system for admin editor changes.
 * Tracks state snapshots and allows reverting.
 */

const MAX_HISTORY = 50;

export function createUndoRedo() {
  let past = [];
  let future = [];
  let current = null;

  return {
    /** Save a snapshot of the current state */
    push(state) {
      if (current !== null) {
        past.push(current);
        if (past.length > MAX_HISTORY) past.shift();
      }
      current = JSON.parse(JSON.stringify(state));
      future = []; // clear redo stack on new action
    },

    /** Undo: revert to previous state */
    undo() {
      if (past.length === 0) return null;
      future.push(current);
      current = past.pop();
      return JSON.parse(JSON.stringify(current));
    },

    /** Redo: restore next state */
    redo() {
      if (future.length === 0) return null;
      past.push(current);
      current = future.pop();
      return JSON.parse(JSON.stringify(current));
    },

    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },

    /** Get counts for UI display */
    getCounts() {
      return { undoCount: past.length, redoCount: future.length };
    },

    /** Clear all history */
    clear() {
      past = [];
      future = [];
      current = null;
    },
  };
}
