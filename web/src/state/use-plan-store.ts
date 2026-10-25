import { useStore } from 'zustand';
import { planStore, type PlanState } from './plan-store.js';

/**
 * Reads one slice of the app-wide plan store from a component. The selector must return a value the store keeps
 * stable (a primitive, or a reference that only changes when the slice changes) — a new object on every call would
 * re-render the component on every store write.
 */
export function usePlanStore<T>(selector: (state: PlanState) => T): T {
  return useStore(planStore, selector);
}
