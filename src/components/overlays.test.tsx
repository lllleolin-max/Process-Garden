import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { builtInThemes } from "../design-system/themes/builtIn";
import { SettingsDrawer } from "./SettingsDrawer";
import { ThemeStudio } from "./ThemeStudio";
import { TopBar } from "./TopBar";

const initial = useAppStore.getState();

function renderShell() {
  return render(<div className="app-shell"><TopBar /><main data-testid="workspace"><button>Background control</button></main><SettingsDrawer /><ThemeStudio /></div>);
}

beforeEach(async () => {
  useAppStore.setState({ ...initial, locale: "en-US", settingsOpen: false, themeStudioOpen: false, themeMenuOpen: false, customThemes: [], themeId: "garden" });
  await i18n.changeLanguage("en-US");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("overlay interactions", () => {
  it("traps settings focus, inerts the workspace and returns focus on Escape while animating out", async () => {
    renderShell();
    const opener = screen.getByRole("button", { name: "Open settings" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    const close = within(dialog).getByRole("button", { name: "Close panel" });
    expect(close).toHaveFocus();
    expect(screen.getByTestId("workspace")).toHaveAttribute("inert");
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(within(dialog).getByRole("button", { name: "Reset preferences" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Escape" });
    expect(dialog.closest("[data-overlay-root]")).toHaveAttribute("data-state", "closed");
    expect(dialog.closest("[data-overlay-root]")).toHaveAttribute("inert");
    expect(screen.getByTestId("workspace")).not.toHaveAttribute("inert");
    await waitFor(() => expect(opener).toHaveFocus());
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it("navigates settings tabs with arrow keys and exposes switch state", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    const general = screen.getByRole("tab", { name: "General" });
    general.focus();
    fireEvent.keyDown(general, { key: "ArrowDown" });
    const garden = screen.getByRole("tab", { name: "Garden" });
    expect(garden).toHaveFocus();
    expect(garden).toHaveAttribute("aria-selected", "true");
    const reducedMotion = screen.getByRole("switch", { name: "Reduced motion" });
    fireEvent.click(reducedMotion);
    expect(reducedMotion).toHaveAttribute("aria-checked", "true");
    expect(useAppStore.getState().reducedMotion).toBe(true);
  });

  it("dismisses the theme chooser outside and transfers focus when opening the studio", async () => {
    renderShell();
    const opener = screen.getByRole("button", { name: "Switch visual theme" });
    fireEvent.click(opener);
    expect(screen.getByRole("button", { name: /Garden Built in/ })).toHaveFocus();
    fireEvent.pointerDown(screen.getByTestId("workspace"));
    expect(opener).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: /Add theme/ }));
    const studio = screen.getByRole("dialog", { name: "Create custom theme" });
    expect(within(studio).getByRole("textbox", { name: "Theme name" })).toHaveFocus();
    await act(async () => { await Promise.resolve(); });
    expect(within(studio).getByRole("textbox", { name: "Theme name" })).toHaveFocus();
    expect(screen.getByTestId("workspace")).toHaveAttribute("inert");
  });

  it("clears search on Escape before any window-level shortcuts run", () => {
    renderShell();
    const search = screen.getByRole("textbox", { name: "Search processes" });
    fireEvent.change(search, { target: { value: "chrome" } });
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(useAppStore.getState().searchQuery).toBe("");
  });
});

describe("theme creation", () => {
  it("shows a complete prompt and accepts a Chinese theme name", () => {
    useAppStore.setState({ themeStudioOpen: true });
    renderShell();
    fireEvent.click(screen.getByText("AI prompts & custom artwork"));
    fireEvent.click(screen.getByRole("button", { name: "View prompt" }));
    expect((screen.getByRole("textbox", { name: "Complete AI artwork prompt" }) as HTMLTextAreaElement).value).toContain("process-atlas-v4.png");
    fireEvent.change(screen.getByRole("textbox", { name: "Theme name" }), { target: { value: "雨夜温室" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(useAppStore.getState().customThemes[0].name["zh-CN"]).toBe("雨夜温室");
    expect(useAppStore.getState().themeId).toMatch(/^[a-z0-9_-]+$/);
  });

  it("stages imports without changing the active theme until confirmed", async () => {
    useAppStore.setState({ themeStudioOpen: true });
    const { container } = renderShell();
    const imported = { ...structuredClone(builtInThemes[0]), id: "preview-import" };
    const file = new File([JSON.stringify(imported)], "preview.json", { type: "application/json" });
    Object.defineProperty(file, "arrayBuffer", { value: async () => new TextEncoder().encode(JSON.stringify(imported)).buffer });
    fireEvent.change(container.querySelector('input[accept*=".pgtheme"]')!, { target: { files: [file] } });
    await screen.findByRole("button", { name: "Install and apply" });
    expect(useAppStore.getState().themeId).toBe("garden");
    expect(useAppStore.getState().customThemes).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Install and apply" }));
    await waitFor(() => expect(useAppStore.getState().themeId).toBe("preview-import"));
  });

  it("preserves an existing theme when a new theme name has the same id", () => {
    const existing = { ...structuredClone(builtInThemes[0]), id: "my-garden", name: { "en-US": "My Garden", "zh-CN": "我的花园" } };
    useAppStore.setState({ customThemes: [existing], themeStudioOpen: true });
    renderShell();
    fireEvent.change(screen.getByRole("textbox", { name: "Theme name" }), { target: { value: "My Garden" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(i18n.t("theme.nameExists"));
    expect(useAppStore.getState().customThemes).toEqual([existing]);
    expect(screen.getByRole("textbox", { name: "Theme name" })).toHaveFocus();
  });

  it("saves a new theme through form submission and closes the studio", () => {
    useAppStore.setState({ themeStudioOpen: true });
    renderShell();
    const name = screen.getByRole("textbox", { name: "Theme name" });
    fireEvent.change(name, { target: { value: "Fern at dusk" } });
    fireEvent.submit(name.closest("form")!);
    expect(useAppStore.getState().themeId).toBe("fern-at-dusk");
    expect(useAppStore.getState().customThemes).toHaveLength(1);
    expect(useAppStore.getState().themeStudioOpen).toBe(false);
  });

  it("does not install an import that finishes after the studio was closed", async () => {
    useAppStore.setState({ themeStudioOpen: true });
    const { container } = renderShell();
    const imported = { ...structuredClone(builtInThemes[0]), id: "delayed-import" };
    let finishRead!: (buffer: ArrayBuffer) => void;
    const file = new File([JSON.stringify(imported)], "delayed.json", { type: "application/json" });
    Object.defineProperty(file, "arrayBuffer", { value: () => new Promise<ArrayBuffer>((resolve) => { finishRead = resolve; }) });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(screen.getByRole("button", { name: i18n.t("theme.importing") })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    await act(async () => { finishRead(new TextEncoder().encode(JSON.stringify(imported)).buffer); });
    expect(useAppStore.getState().customThemes).toHaveLength(0);
    expect(useAppStore.getState().themeId).toBe("garden");
  });
});
