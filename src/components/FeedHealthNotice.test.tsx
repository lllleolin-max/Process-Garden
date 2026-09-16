import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";
import { FeedHealthNotice } from "./FeedHealthNotice";

beforeEach(() => {
  useAppStore.setState({ locale: "en-US", paused: false, demoMode: false });
  useFeedHealth.setState({ failed: false, lastSuccess: null });
});
afterEach(cleanup);

it("shows initial native failure without claiming a last successful sample", () => {
  useFeedHealth.setState({ failed: true });
  render(<FeedHealthNotice />);
  expect(screen.getByRole("status")).toHaveTextContent("No native sample received");
  expect(screen.getByRole("status")).toHaveTextContent("retrying automatically");
  act(() => useAppStore.setState({ paused: true }));
  expect(screen.getByRole("status")).toHaveTextContent("retries paused");
});

it("shows stale sample time in Chinese and clears after recovery or demo switch", () => {
  useAppStore.setState({ locale: "zh-CN" });
  useFeedHealth.setState({ failed: true, lastSuccess: 1_800_000_000_000 });
  render(<FeedHealthNotice />);
  expect(screen.getByRole("status")).toHaveTextContent("数据已过期 · 最后成功采样：");
  act(() => useFeedHealth.setState({ failed: false }));
  expect(screen.queryByRole("status")).toBeNull();
  act(() => { useFeedHealth.setState({ failed: true }); useAppStore.setState({ demoMode: true }); });
  expect(screen.queryByRole("status")).toBeNull();
});
