import { useLayoutEffect, useRef, useState } from "react";

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const EXIT_MS = 180;

function focusableWithin(element: HTMLElement) {
  return [...element.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => !item.closest('[hidden], [inert], [aria-hidden="true"]') && item.tabIndex >= 0);
}

/** Keeps a closing surface mounted while giving focus back immediately. */
export function useOverlay<T extends HTMLElement = HTMLElement>(open: boolean, onClose: () => void, options: {
  modal?: boolean;
  restoreFocusSelector?: string;
  initialFocusSelector?: string;
} = {}) {
  const { modal = true, restoreFocusSelector, initialFocusSelector } = options;
  const surfaceRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [present, setPresent] = useState(open);

  useLayoutEffect(() => {
    if (!open || !surfaceRef.current) return;
    const root = surfaceRef.current.closest<HTMLElement>("[data-overlay-root]") ?? surfaceRef.current;
    // Keep this marker through an interrupted exit so CSS transitions reverse
    // from their current pose. A genuinely new surface gets an initial paint.
    if (root.hasAttribute("data-motion-ready")) return;
    const reduced = document.documentElement.dataset.reducedMotion === "true" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { root.setAttribute("data-motion-ready", ""); return; }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => root.setAttribute("data-motion-ready", ""));
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useLayoutEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const reduced = document.documentElement.dataset.reducedMotion === "true" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPresent(false), reduced ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !surfaceRef.current) return;
    const surface = surfaceRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreTarget = restoreFocusSelector ? document.querySelector<HTMLElement>(restoreFocusSelector) : previouslyFocused;
    const root = surface.closest<HTMLElement>("[data-overlay-root]") ?? surface;
    const inertElements: Array<{ element: HTMLElement; wasInert: boolean }> = [];
    if (modal) {
      // Inert each sibling branch up to body, preserving pre-existing inert state.
      let branch: HTMLElement = root;
      while (branch.parentElement && branch.parentElement !== document.body) {
        for (const sibling of branch.parentElement.children) {
          if (!(sibling instanceof HTMLElement) || sibling === branch || sibling.matches('[data-overlay-root], script, style')) continue;
          inertElements.push({ element: sibling, wasInert: sibling.hasAttribute("inert") });
          sibling.setAttribute("inert", "");
        }
        branch = branch.parentElement;
      }
    }
    const initial = initialFocusSelector ? surface.querySelector<HTMLElement>(initialFocusSelector) : null;
    (initial ?? focusableWithin(surface)[0] ?? surface).focus({ preventScroll: true });

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== "Tab" || !modal) return;
      const items = focusableWithin(surface);
      const first = items[0] ?? surface;
      const last = items[items.length - 1] ?? surface;
      if (event.shiftKey && (document.activeElement === first || !surface.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !surface.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    const pointerHandler = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || surface.contains(target) || restoreTarget?.contains(target)) return;
      closeRef.current();
    };
    const focusHandler = (event: FocusEvent) => {
      if (surface.contains(event.target as Node)) return;
      if (modal) (focusableWithin(surface)[0] ?? surface).focus({ preventScroll: true });
      else if (event.target !== restoreTarget) closeRef.current();
    };
    document.addEventListener("keydown", keyHandler, true);
    document.addEventListener("pointerdown", pointerHandler);
    document.addEventListener("focusin", focusHandler);
    return () => {
      document.removeEventListener("keydown", keyHandler, true);
      document.removeEventListener("pointerdown", pointerHandler);
      document.removeEventListener("focusin", focusHandler);
      for (const { element, wasInert } of inertElements) if (!wasInert) element.removeAttribute("inert");
      // A newly opened overlay owns focus during settings → studio handoff.
      queueMicrotask(() => {
        if (document.querySelector('[data-overlay-root][data-state="open"]')) return;
        const active = document.activeElement;
        if (active === document.body || surface.contains(active)) {
          if (restoreTarget?.isConnected && !restoreTarget.closest("[inert]")) restoreTarget.focus({ preventScroll: true });
        }
      });
    };
  }, [open, modal, restoreFocusSelector, initialFocusSelector]);

  return { surfaceRef, present: open || present, state: open ? "open" : "closed" } as const;
}
