import { agentEmbryoStage } from "../ecology/organisms";
import type { ProcessSnapshot } from "../types/system";
import { ELDRITCH_SWALLOW_DURATION_MS, getEldritchSwallowMotion } from "./eldritchLifecycle";
import { damp, stableProcessAngle } from "./smoothing";
import { processIdentity as identity } from "./processIdentity";

export const EMBRYO_BIRTH_MS = 1_450;
const GARDEN_EXIT_MS = 1_400;
type Point = { x: number; y: number };
export interface EmbryoParent extends Point { pid: number; radius: number; exiting: boolean }
export interface EmbryoNode extends Point {
  key: string;
  pid: number;
  parentPid: number;
  process: ProcessSnapshot;
  slot: number;
  radius: number;
  targetRadius: number;
  opacity: number;
  displayCpu: number;
  stage: 0 | 1 | 2;
  weights: number[];
  bornAt: number;
  origin: Point;
  tetherOrigin: Point;
  exiting: boolean;
  transitionStartedAt: number;
  exitOrigin: Point;
  exitRadius: number;
  exitOpacity: number;
}
interface EmbryoFrame {
  processes: ProcessSnapshot[];
  snapshotAt: number;
  parents: Map<number, EmbryoParent>;
  time: number;
  deltaMs: number;
  width: number;
  height: number;
  core: Point;
  eldritch: boolean;
  frozen: boolean;
  limit: number;
  preferredPid?: number | null;
}

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Bounded, persistent child state. Sampling changes targets, never recreates actors. */
export class AgentEmbryoScene {
  readonly nodes = new Map<string, EmbryoNode>();
  private source: ProcessSnapshot[] | null = null;
  private snapshotAt = 0;
  private parentSignature = "";
  private layout = "";
  private preferredPid: number | null = null;
  private desired = new Map<string, ProcessSnapshot>();

  update(frame: EmbryoFrame) {
    const { parents, processes, time, deltaMs, frozen, limit } = frame;
    const parentSignature = [...parents.values()].filter((p) => !p.exiting).map((p) => p.pid).join(",");
    const layout = `${frame.width}:${frame.height}:${limit}`;
    const preferredPid = frame.preferredPid ?? null;
    const dataChanged = this.source !== processes || this.snapshotAt !== frame.snapshotAt || this.parentSignature !== parentSignature || this.layout !== layout;
    const changed = dataChanged || this.preferredPid !== preferredPid;
    if (changed) {
      this.source = processes;
      this.snapshotAt = frame.snapshotAt;
      this.parentSignature = parentSignature;
      this.layout = layout;
      this.preferredPid = preferredPid;
      this.desired.clear();
      const children = new Map<number, ProcessSnapshot[]>();
      for (const process of processes) {
        const parent = parents.get(process.parentPid ?? -1);
        if (!parent || parent.exiting || process.status === "dead") continue;
        const siblings = children.get(parent.pid) ?? [];
        siblings.push(process);
        children.set(parent.pid, siblings);
      }
      for (const siblings of children.values()) {
        // Incumbents keep their slots even when collectors reorder the process list.
        siblings.sort((a, b) => {
          const slotA = this.nodes.get(identity(a))?.slot ?? Infinity;
          const slotB = this.nodes.get(identity(b))?.slot ?? Infinity;
          return Number(b.pid === preferredPid) - Number(a.pid === preferredPid) || slotA - slotB || a.pid - b.pid;
        });
        for (const process of siblings.slice(0, limit)) this.desired.set(identity(process), process);
      }
    }

    for (const [key, node] of this.nodes) {
      const process = this.desired.get(key);
      if (process && process.parentPid === node.parentPid && node.slot < limit) {
        node.process = process;
        node.stage = agentEmbryoStage(process, frame.snapshotAt);
        if (node.exiting) { node.exiting = false; node.bornAt = time - EMBRYO_BIRTH_MS; }
      } else if (frozen && changed) {
        this.nodes.delete(key);
      } else if (!node.exiting) {
        node.exiting = true;
        node.transitionStartedAt = time;
        node.exitOrigin = { x: node.x, y: node.y };
        node.exitRadius = node.radius;
        node.exitOpacity = node.opacity;
      }
      const duration = frame.eldritch ? ELDRITCH_SWALLOW_DURATION_MS + 80 : GARDEN_EXIT_MS;
      if (node.exiting && time - node.transitionStartedAt >= duration) this.nodes.delete(key);
    }

    // Retiring actors occupy a slot until their full exit finishes. Rapid process
    // churn cannot produce an unbounded pile of fading sprites or cut an exit short.
    const added = new Set<string>();
    for (const [key, process] of this.desired) {
      if (this.nodes.has(key)) continue;
      const parent = parents.get(process.parentPid!)!;
      const occupied = new Set([...this.nodes.values()].filter((n) => n.parentPid === parent.pid).map((n) => n.slot));
      const slot = Array.from({ length: limit }, (_, index) => index).find((index) => !occupied.has(index));
      if (slot === undefined) continue;
      const origin = frame.eldritch ? frame.core : parent;
      const stage = agentEmbryoStage(process, frame.snapshotAt);
      this.nodes.set(key, {
        key, pid: process.pid, parentPid: parent.pid, process, slot,
        x: origin.x, y: origin.y, origin: { x: origin.x, y: origin.y },
        tetherOrigin: { x: parent.x, y: parent.y },
        radius: 1, targetRadius: 8, opacity: 0, displayCpu: process.cpuPercent,
        stage, weights: [0, 1, 2].map((value) => Number(value === stage)),
        bornAt: time, exiting: false, transitionStartedAt: time,
        exitOrigin: { x: origin.x, y: origin.y }, exitRadius: 1, exitOpacity: 0
      });
      added.add(key);
    }

    for (const node of this.nodes.values()) {
      if (frozen && !dataChanged && !added.has(node.key)) continue;
      const parent = parents.get(node.parentPid);
      if (node.exiting) {
        const elapsed = time - node.transitionStartedAt;
        if (frame.eldritch) {
          const swallow = getEldritchSwallowMotion(elapsed);
          const dx = frame.core.x - node.exitOrigin.x;
          const dy = frame.core.y - node.exitOrigin.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const spiral = (1 - swallow.suction) * Math.min(48, node.exitRadius * 2.8) * Math.sin(swallow.spiralTurns * Math.PI * 2);
          node.x = node.exitOrigin.x + dx * swallow.suction - dy / distance * spiral;
          node.y = node.exitOrigin.y + dy * swallow.suction + dx / distance * spiral - Math.sin(swallow.suction * Math.PI) * Math.min(54, distance * 0.2);
          node.radius = node.exitRadius * swallow.nodeScale;
          node.opacity = node.exitOpacity * swallow.nodeOpacity;
        } else {
          const progress = smooth(elapsed / GARDEN_EXIT_MS);
          node.x = node.exitOrigin.x + Math.sin(node.pid) * progress * 12;
          node.y = node.exitOrigin.y - progress * 26;
          node.radius = node.exitRadius * (1 - progress * 0.5);
          node.opacity = node.exitOpacity * (1 - progress);
        }
        continue;
      }
      if (!parent) continue;
      node.tetherOrigin = { x: parent.x, y: parent.y };
      node.weights = node.weights.map((weight, stage) => frozen ? Number(stage === node.stage) : damp(weight, Number(stage === node.stage), deltaMs, 320));
      const growth = node.weights[1] + node.weights[2] * 2;
      node.targetRadius = Math.max(8, Math.min(17, parent.radius * (0.38 + growth * 0.055)));
      const angle = stableProcessAngle(parent.pid) + node.slot / 3 * Math.PI * 2 + time * 0.00018;
      const distance = parent.radius * (2.3 + node.slot * 0.18);
      const margin = node.targetRadius * 2.2;
      const x = Math.max(margin, Math.min(frame.width - margin, parent.x + Math.cos(angle) * distance));
      const y = Math.max(margin, Math.min(frame.height - margin, parent.y + Math.sin(angle) * distance * 0.78));
      if (frozen) {
        node.x = x; node.y = y; node.radius = node.targetRadius; node.opacity = 1;
        node.bornAt = time - EMBRYO_BIRTH_MS;
        node.displayCpu = node.process.cpuPercent;
      } else {
        const birth = Math.min(1, (time - node.bornAt) / EMBRYO_BIRTH_MS);
        if (birth < 1) {
          const travel = 1 - (1 - Math.max(0, (birth - 0.12) / 0.88)) ** 3;
          node.x = node.origin.x + (x - node.origin.x) * travel;
          node.y = node.origin.y + (y - node.origin.y) * travel - Math.sin(birth * Math.PI) * node.targetRadius * 2;
          node.radius = node.targetRadius * (0.15 + travel * 0.85);
          node.opacity = smooth((birth - 0.05) / 0.25);
        } else {
          node.x = damp(node.x, x, deltaMs, 240);
          node.y = damp(node.y, y, deltaMs, 240);
          node.radius = damp(node.radius, node.targetRadius, deltaMs, 320);
          node.opacity = damp(node.opacity, 1, deltaMs, 220);
        }
        node.displayCpu = damp(node.displayCpu, node.process.cpuPercent, deltaMs, 620);
      }
    }
    return [...this.nodes.values()];
  }
}
