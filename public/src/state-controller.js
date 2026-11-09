// 8-state navigation controller:
// State 0: Final Model (intro)
// States 1..6: Step 1 .. Step 6
// State 7: Final Model (completed)

export const TOTAL_STATES = 8; // 0..7

/**
 * Creates an 8-state navigation controller for the Little Frog assembly steps.
 * @param {number} [initialState=0] - Initial state index (0..7).
 * @returns {object} State controller with getState, next, prev, setState, subscribe.
 */
export function createStateController(initialState = 0) {
  let currentState = Number.isInteger(initialState) && initialState >= 0 && initialState < TOTAL_STATES ? initialState : 0;
  const listeners = new Set();

  function notify(prevState) {
    for (const fn of listeners) {
      fn(currentState, prevState);
    }
  }

  return {
    getState() {
      return currentState;
    },
    next() {
      const prev = currentState;
      currentState = (currentState + 1) % TOTAL_STATES;
      notify(prev);
      return currentState;
    },
    prev() {
      const prev = currentState;
      currentState = (currentState - 1 + TOTAL_STATES) % TOTAL_STATES;
      notify(prev);
      return currentState;
    },
    setState(idx) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= TOTAL_STATES || idx === currentState) return currentState;
      const prev = currentState;
      currentState = idx;
      notify(prev);
      return currentState;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
