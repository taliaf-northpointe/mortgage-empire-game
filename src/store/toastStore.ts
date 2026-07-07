/**
 * Tiny toast queue for action feedback ("You checked in with Sarah — +2
 * happiness"). UI-only state — nothing here is saved.
 */
import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  pushToast(message: string): void;
  dismissToast(id: number): void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  pushToast(message) {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message }] }));
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Convenience for non-component callers (gameStore actions). */
export function pushToast(message: string): void {
  useToastStore.getState().pushToast(message);
}
