import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { SettingsDrawer } from "./SettingsDrawer";

const initial = useAppStore.getState();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAppStore.setState(initial);
  localStorage.clear();
});

it("only classifies the mapping list when visible and reuses it for unrelated preferences", async () => {
  await i18n.changeLanguage("en-US");
  const processes = [...initial.snapshot.processes];
  const filter = vi.spyOn(processes, "filter");
  useAppStore.setState({ ...initial, settingsOpen: false, snapshot: { ...initial.snapshot, processes } });
  render(<SettingsDrawer />);
  expect(filter).not.toHaveBeenCalled();
  act(() => useAppStore.setState({ settingsOpen: true }));
  expect(filter).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("tab", { name: "Garden" }));
  expect(filter).toHaveBeenCalledTimes(2);
  const application = screen.getAllByRole("combobox")[0];
  expect(application).not.toHaveValue("");
  act(() => useAppStore.setState({ particlesEnabled: !initial.particlesEnabled }));
  expect(filter).toHaveBeenCalledTimes(2);
  const nextProcesses = [...processes];
  const nextFilter = vi.spyOn(nextProcesses, "filter");
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, processes: nextProcesses } }));
  expect(nextFilter).toHaveBeenCalledTimes(2);
  expect(application).not.toHaveValue("");
  fireEvent.click(screen.getByRole("tab", { name: "General" }));
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, processes } }));
  expect(filter).toHaveBeenCalledTimes(2);
});
