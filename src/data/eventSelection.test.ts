import { expect, it } from "vitest";
import { eventTarget } from "./eventSelection";
import { deriveProcessEvents } from "./events";
import { makeDemoSnapshot, demoEvents } from "./demo";

it("never selects a replacement lifetime from an old event", () => {
  const before = makeDemoSnapshot(0);
  const old = before.processes[0];
  const next = { ...before, timestamp: before.timestamp + 1000, processes: [{ ...old, startedAt: old.startedAt + 1 }] };
  const events = deriveProcessEvents(before, next);
  const exit = events.find(event => event.pid === old.pid && event.kind === "exit")!;
  const birth = events.find(event => event.pid === old.pid && event.kind === "birth")!;
  expect(eventTarget(exit, next)).toBeNull();
  expect(eventTarget(birth, next)).toBe(old.pid);
  expect(eventTarget({ ...birth, processKey: undefined }, next)).toBeNull();
  expect(eventTarget(birth, { ...next, processes: [] })).toBeNull();
});

it("keeps known demo lifetimes selectable and ignores equivalent time units", () => {
  const snapshot = makeDemoSnapshot(0);
  const event = demoEvents[0];
  expect(eventTarget(event, snapshot)).toBe(event.pid);
  const milliseconds = { ...snapshot, processes: snapshot.processes.map(process => ({ ...process, startedAt: process.startedAt * 1000 })) };
  expect(eventTarget(event, milliseconds)).toBe(event.pid);
});
