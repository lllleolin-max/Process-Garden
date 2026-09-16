import { create } from "zustand";

/** Session-only acquisition health; never persisted with user preferences. */
export const useFeedHealth = create<{ failed: boolean; stalled: boolean; lastSuccess: number | null }>(() => ({
  failed: false,
  stalled: false,
  lastSuccess: null
}));
