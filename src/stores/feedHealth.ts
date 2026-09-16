import { create } from "zustand";

/** Session-only acquisition health; never persisted with user preferences. */
export const useFeedHealth = create<{ failed: boolean; lastSuccess: number | null }>(() => ({
  failed: false,
  lastSuccess: null
}));
