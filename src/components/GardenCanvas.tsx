import { Boxes, Focus, Orbit, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { builtInThemes } from "../design-system/themes/builtIn";
import { CelestialClock, type CelestialBodyState, type CelestialCycleState } from "../animation/celestialCycle";
import { getCachedSceneAssets, loadSceneAssets, sceneAssetFamily, sceneBackground } from "../animation/sceneAssets";
import { ELDRITCH_SWALLOW_DURATION_MS, getEldritchSwallowMotion } from "../animation/eldritchLifecycle";
import { decideAnimationFrame } from "../animation/frameRate";
import { damp, stableProcessAngle } from "../animation/smoothing";
import { SceneClock } from "../animation/sceneClock";
import { LabelMotion } from "../animation/labelMotion";
import { ambientFaunaPose, ambientVisibility } from "../animation/ambientMotion";
import { AgentEmbryoScene, EMBRYO_BIRTH_MS } from "../animation/agentEmbryos";
import { hitTestScene, placeSceneLabel, separateSceneNodes, type LabelBox } from "../animation/sceneLayout";
import { selectPopulation } from "../ecology/population";
import { isAgentProcess, organismVariantIndex, organismVisualIndex, resolveOrganismStyle } from "../ecology/organisms";
import { formatBytes, formatPercent } from "../i18n/formatters";
import { useAppStore } from "../stores/appStore";
import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";
import type { ThemeManifest } from "../types/theme";
import { ProcessIcon } from "./ProcessIcon";
import "./GardenCanvas.css";

interface NodePosition { pid: number; x: number; y: number; radius: number }
interface VisualNode extends NodePosition {
  process: ProcessSnapshot;
  targetX: number;
  targetY: number;
  targetRadius: number;
  opacity: number;
  targetOpacity: number;
  displayCpu: number;
  displayMemory: number;
  bornAt: number;
  lastSeenAt: number;
  transitionStartedAt: number;
  exitOriginX: number;
  exitOriginY: number;
  exitRadius: number;
  exitOpacity: number;
  exiting: boolean;
  emphasis: number;
  emphasisTarget: number;
}
type SceneLabelNode = Pick<VisualNode, "pid" | "x" | "y" | "radius" | "targetRadius" | "process" | "opacity" | "exiting" | "displayCpu">;

const processIconImageCache = new Map<string, HTMLImageElement>();

const nameColors: Record<string, string> = {
  chrome: "#78e675", code: "#38bdf8", node: "#a878f5", spotify: "#6ce78d", postgres: "#a86fe4",
  docker: "#eca94f", python: "#52cbea", system: "#7ee39b", explorer: "#68d8b6", terminal: "#cfdb73",
  discord: "#8d78f2", "rust-analyzer": "#ef8a52", vite: "#bf74f2", webview2: "#4fd3ae"
};

function processColor(process: ProcessSnapshot, theme: ThemeManifest, eldritch = false, styleIndex = -1) {
  if (eldritch) return ["#79e395", "#a37af5", "#62d6ed", "#e9ad59", "#7ade86", "#57d9d6", "#a276ef", "#76e0b3"][styleIndex >= 0 ? styleIndex : process.pid % 8];
  return nameColors[process.name.toLowerCase()] ?? (process.cpuPercent > 12 ? theme.colors.warning : theme.colors.primary);
}

function withAlpha(color: string, alpha: number) {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const value = hex.length === 3 ? [...hex].map((character) => character.repeat(2)).join("") : hex;
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
  }
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  return color;
}

function drawGlowCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, glow: number) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = radius * (0.9 + glow);
  const gradient = context.createRadialGradient(x - radius * 0.25, y - radius * 0.25, radius * 0.05, x, y, radius);
  gradient.addColorStop(0, "rgba(255,255,255,.9)");
  gradient.addColorStop(0.12, color);
  gradient.addColorStop(0.55, withAlpha(color, 0.61));
  gradient.addColorStop(1, withAlpha(color, 0.07));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCelestialBody(
  context: CanvasRenderingContext2D,
  body: CelestialBodyState,
  kind: "sun" | "moon",
  centerX: number,
  horizonY: number,
  orbitRadiusX: number,
  orbitRadiusY: number,
  radius: number,
  time: number,
  eldritch: boolean,
  image: HTMLCanvasElement | null
) {
  if (body.visibility < 0.01 || !image) return;
  const x = centerX + body.orbitX * orbitRadiusX;
  const y = horizonY - body.altitude * orbitRadiusY;
  const color = kind === "sun" ? (eldritch ? "#e7a84e" : "#f7d77a") : (eldritch ? "#a68af0" : "#b9e4ef");
  const pulse = 1 + Math.sin(time * 0.00055 + (kind === "moon" ? 2.4 : 0)) * 0.035;

  context.save();
  context.globalAlpha = body.visibility;
  const halo = context.createRadialGradient(x, y, radius * 0.2, x, y, radius * 4.5);
  halo.addColorStop(0, withAlpha(color, eldritch ? 0.42 : 0.5));
  halo.addColorStop(0.28, withAlpha(color, 0.17));
  halo.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(x, y, radius * 4.5, 0, Math.PI * 2);
  context.fill();

  context.translate(x, y);
  context.rotate(time * (kind === "sun" ? 0.000025 : -0.000012));

  context.shadowColor = color;
  context.shadowBlur = radius * 1.25;
  const imageSize = radius * pulse * (eldritch ? 3.55 : 3.35);
  context.drawImage(image, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
  context.shadowBlur = 0;
  context.restore();
}

function drawCelestialCycle(context: CanvasRenderingContext2D, width: number, height: number, time: number, eldritch: boolean, cycle: CelestialCycleState, sunImage: HTMLCanvasElement | null, moonImage: HTMLCanvasElement | null) {
  if (!sunImage || !moonImage) return;
  const centerX = width * 0.5;
  const horizonY = height * 0.7;
  const orbitRadiusX = width * 0.43;
  const orbitRadiusY = height * 0.54;
  const bodyRadius = Math.max(15, Math.min(30, Math.min(width, height) * 0.04));

  context.save();
  context.strokeStyle = eldritch ? "rgba(158,126,231,.13)" : "rgba(164,220,181,.13)";
  context.lineWidth = 0.8;
  context.setLineDash([2, 8]);
  context.beginPath();
  context.ellipse(centerX, horizonY, orbitRadiusX, orbitRadiusY, 0, Math.PI, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  const night = cycle.moon.visibility;
  if (night > 0.02) {
    context.fillStyle = eldritch ? "#b998ff" : "#d8f5e6";
    for (let star = 0; star < 28; star += 1) {
      const seed = star * 71.37;
      const x = (seed * 19.7) % Math.max(width, 1);
      const y = height * (0.07 + ((seed * 3.1) % 52) / 100);
      const shimmer = 0.45 + Math.sin(time * 0.0012 + star * 2.1) * 0.2;
      context.globalAlpha = night * shimmer;
      context.beginPath();
      context.arc(x, y, 0.6 + (star % 3) * 0.35, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();

  drawCelestialBody(context, cycle.sun, "sun", centerX, horizonY, orbitRadiusX, orbitRadiusY, bodyRadius, time, eldritch, sunImage);
  drawCelestialBody(context, cycle.moon, "moon", centerX, horizonY, orbitRadiusX, orbitRadiusY, bodyRadius * 0.92, time, eldritch, moonImage);
}

function drawCreatureDetails(context: CanvasRenderingContext2D, process: ProcessSnapshot, x: number, y: number, radius: number, color: string, index: number, time: number, eldritch: boolean) {
  const phase = time * 0.0004 + process.pid;
  const kind = process.status === "stressed" ? 0 : (process.pid + index) % 4;
  context.save();
  context.strokeStyle = withAlpha(color, 0.78);
  context.fillStyle = withAlpha(color, 0.28);
  context.lineWidth = 1.1;
  if (kind === 0) {
    const spikes = eldritch ? 11 : 8;
    context.beginPath();
    for (let point = 0; point < spikes * 2; point += 1) {
      const angle = point / (spikes * 2) * Math.PI * 2 + phase * 0.1;
      const distance = radius * (point % 2 ? 0.72 : 1.18 + Math.sin(phase) * 0.06);
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      if (point === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.closePath(); context.stroke();
  } else if (kind === 1) {
    const lobes = 4 + (process.pid % 3);
    for (let lobe = 0; lobe < lobes; lobe += 1) {
      const angle = lobe / lobes * Math.PI * 2 + phase * 0.08;
      context.beginPath();
      context.ellipse(x + Math.cos(angle) * radius * 0.6, y + Math.sin(angle) * radius * 0.6, radius * 0.34, radius * 0.18, angle, 0, Math.PI * 2);
      context.fill(); context.stroke();
    }
  } else if (kind === 2) {
    const tendrils = eldritch ? 7 : 5;
    for (let tendril = 0; tendril < tendrils; tendril += 1) {
      const angle = tendril / tendrils * Math.PI * 2 + Math.sin(phase) * 0.08;
      context.beginPath();
      context.moveTo(x + Math.cos(angle) * radius * 0.55, y + Math.sin(angle) * radius * 0.55);
      context.quadraticCurveTo(x + Math.cos(angle + 0.42) * radius * 1.05, y + Math.sin(angle + 0.42) * radius * 1.05, x + Math.cos(angle) * radius * 1.24, y + Math.sin(angle) * radius * 1.24);
      context.stroke();
    }
  } else {
    const satellites = 3 + (process.pid % 4);
    for (let satellite = 0; satellite < satellites; satellite += 1) {
      const angle = satellite / satellites * Math.PI * 2 - phase * 0.12;
      context.beginPath();
      context.arc(x + Math.cos(angle) * radius * 0.88, y + Math.sin(angle) * radius * 0.88, Math.max(1.5, radius * 0.12), 0, Math.PI * 2);
      context.fill(); context.stroke();
    }
  }
  context.restore();
}

function drawRasterCreature(
  context: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  process: ProcessSnapshot,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number,
  selected: boolean
) {
  const pulse = 1 + Math.sin(time * 0.0012 + process.pid) * 0.035;
  const size = radius * 4.15 * pulse;
  context.save();
  const halo = context.createRadialGradient(x, y, radius * 0.18, x, y, radius * 1.75);
  halo.addColorStop(0, withAlpha(color, selected ? 0.28 : 0.17));
  halo.addColorStop(0.52, withAlpha(color, 0.07));
  halo.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(x, y, radius * 1.8, 0, Math.PI * 2);
  context.fill();
  context.translate(x, y);
  context.rotate(Math.sin(time * 0.00035 + process.pid) * 0.035);
  context.globalCompositeOperation = "screen";
  context.globalAlpha *= selected ? 1 : 0.9;
  context.drawImage(sprite, -size / 2, -size / 2, size, size);
  context.restore();
  context.save();
  context.strokeStyle = selected ? "rgba(218,255,231,.9)" : withAlpha(color, 0.35);
  context.lineWidth = selected ? 1.6 : 0.7;
  context.setLineDash(selected ? [3, 4] : [1, 5]);
  context.beginPath();
  context.arc(x, y, radius * 1.18, time * 0.0003, Math.PI * 1.65 + time * 0.0003);
  context.stroke();
  context.restore();
}

function drawGardenGlyph(context: CanvasRenderingContext2D, process: ProcessSnapshot, x: number, y: number, radius: number) {
  const name = process.name.toLowerCase();
  const size = radius * 0.46;
  context.save();
  context.translate(x, y);
  context.lineCap = "round";
  context.lineJoin = "round";
  if (name === "chrome") {
    ["#ef5b4d", "#f6c84c", "#66cc6a"].forEach((color, index) => {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, size, -Math.PI / 2 + index * Math.PI * 2 / 3, -Math.PI / 2 + (index + 1) * Math.PI * 2 / 3);
      context.closePath();
      context.fill();
    });
    context.fillStyle = "#e9f7ff";
    context.beginPath(); context.arc(0, 0, size * 0.55, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#3489db";
    context.beginPath(); context.arc(0, 0, size * 0.43, 0, Math.PI * 2); context.fill();
  } else if (name === "code") {
    context.strokeStyle = "#dff7ff"; context.lineWidth = Math.max(2, radius * 0.12);
    context.beginPath();
    context.moveTo(-size * 0.78, -size * 0.12); context.lineTo(-size * 0.18, -size * 0.7); context.lineTo(size * 0.72, 0); context.lineTo(-size * 0.18, size * 0.7); context.lineTo(-size * 0.78, size * 0.12); context.lineTo(-size * 0.34, 0); context.closePath();
    context.stroke();
  } else if (name === "spotify") {
    context.fillStyle = "#07120d"; context.beginPath(); context.arc(0, 0, size, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#7bf29c"; context.lineWidth = Math.max(1.4, radius * 0.075);
    for (let line = 0; line < 3; line += 1) {
      context.beginPath();
      context.arc(0, size * (0.12 + line * 0.14), size * (0.72 - line * 0.08), Math.PI * 1.12, Math.PI * 1.88);
      context.stroke();
    }
  } else if (name === "docker") {
    context.fillStyle = "#eafaff";
    const block = Math.max(2, size * 0.28);
    for (let row = 0; row < 2; row += 1) for (let column = 0; column < 3 + row; column += 1) context.fillRect(-size * 0.72 + column * (block + 1), -size * 0.42 + row * (block + 1), block, block);
    context.beginPath(); context.arc(0, size * 0.18, size * 0.7, 0.08, Math.PI - 0.08); context.fill();
  } else {
    const label = name === "postgres" ? "PG" : name === "python" ? "Py" : name === "node" ? "JS" : process.name.slice(0, 2).toUpperCase();
    context.globalAlpha *= 0.94;
    context.fillStyle = "#effff6";
    context.font = `700 ${Math.max(9, radius * 0.37)}px "JetBrains Mono Variable", monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 0, 1);
  }
  context.restore();
}

function drawProcessIdentity(
  context: CanvasRenderingContext2D,
  process: ProcessSnapshot,
  image: HTMLImageElement | undefined,
  x: number,
  y: number,
  radius: number,
  color: string,
  selected: boolean,
  eldritch: boolean,
  time: number
) {
  const breath = 1 + Math.sin(time * 0.0011 + process.pid * 0.37) * 0.028;
  const badgeRadius = radius * breath;
  context.save();
  context.globalAlpha *= selected ? 0.99 : 0.91;
  context.fillStyle = eldritch ? "rgba(1, 7, 7, .9)" : "rgba(2, 12, 9, .87)";
  context.strokeStyle = withAlpha(color, selected ? 0.92 : 0.62);
  context.lineWidth = selected ? 1.5 : 0.9;
  context.shadowColor = withAlpha(color, selected ? 0.58 : 0.28);
  context.shadowBlur = selected ? 11 : 6;
  context.beginPath();
  if (eldritch) {
    context.ellipse(x, y, badgeRadius, badgeRadius * 0.92, Math.sin(process.pid) * 0.14, 0, Math.PI * 2);
  } else {
    context.arc(x, y, badgeRadius, 0, Math.PI * 2);
  }
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  if (image?.complete && image.naturalWidth) {
    const size = badgeRadius * 1.48;
    context.drawImage(image, x - size / 2, y - size / 2, size, size);
  } else {
    drawGardenGlyph(context, process, x, y, badgeRadius * 1.72);
  }
  context.restore();
}

function drawCore(context: CanvasRenderingContext2D, x: number, y: number, radius: number, theme: ThemeManifest, time: number, eldritch: boolean, maskedCore: HTMLCanvasElement | null, mouthOpen = 0, coreKick = 0, maw: HTMLCanvasElement | null = null) {
  if (eldritch && coreKick > 0) {
    x += Math.sin(time * 0.045) * coreKick * 9;
    y -= coreKick * 7;
  }
  const pulse = Math.sin(time * 0.0014) * 0.05 + 1;
  const size = radius * pulse;
  for (let ring = 3; ring >= 0; ring -= 1) {
    context.save();
    context.globalAlpha = 0.11 + ring * 0.035;
    context.strokeStyle = ring % 2 ? theme.colors.secondary : theme.colors.primary;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(x, y, size + ring * 12 + Math.sin(time * 0.0008 + ring) * 3, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
  if (maskedCore) {
    const imageSize = size * 3.15;
    if (eldritch && mouthOpen > 0.001 && maw?.width) {
      const openness = Math.min(1, mouthOpen);
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = 0.82 * (1 - openness);
      context.drawImage(maskedCore, x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
      context.restore();
      context.save();
      // The throat occludes the organism; generated teeth and saliva draw above it.
      context.globalAlpha = openness;
      context.fillStyle = "#030002";
      context.beginPath();
      context.ellipse(x, y + size * 0.08, size * 0.62, size * (0.14 + openness * 0.83), 0, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = "screen";
      const mawWidth = size * (2.22 + openness * 0.34);
      const mawHeight = size * (1.55 + openness * 1.48);
      context.drawImage(maw, x - mawWidth / 2, y - mawHeight / 2, mawWidth, mawHeight);
      context.restore();
      return;
    }
    if (eldritch && mouthOpen > 0.015) {
      const gap = size * mouthOpen * 0.72;
      context.save();
      const throat = context.createRadialGradient(x, y, size * 0.06, x, y, size * 0.9);
      throat.addColorStop(0, "rgba(0,0,0,.99)");
      throat.addColorStop(0.5, "rgba(36,0,11,.98)");
      throat.addColorStop(0.82, "rgba(128,8,38,.82)");
      throat.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = throat;
      context.shadowColor = "rgba(224,18,66,.72)";
      context.shadowBlur = 14 + mouthOpen * 20;
      context.beginPath();
      context.ellipse(x, y + size * 0.08, size * (0.64 + mouthOpen * 0.44), size * (0.08 + mouthOpen * 0.58), 0, 0, Math.PI * 2);
      context.fill();
      context.restore();

      const drawJawHalf = (top: boolean) => {
        context.save();
        context.globalCompositeOperation = "screen";
        context.globalAlpha = 0.9;
        context.beginPath();
        context.rect(x - imageSize / 2, top ? y - imageSize / 2 - gap : y, imageSize, imageSize / 2 + gap);
        context.clip();
        context.drawImage(maskedCore, x - imageSize / 2, y - imageSize / 2 + (top ? -gap : gap), imageSize, imageSize);
        context.restore();
      };
      drawJawHalf(true);
      drawJawHalf(false);

      return;
    }
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.82;
    context.drawImage(maskedCore, x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
    context.restore();
    return;
  }
  drawGlowCircle(context, x, y, size, theme.colors.primary, theme.effects.glow);
  context.save();
  context.strokeStyle = "rgba(220,255,232,.8)";
  context.fillStyle = "rgba(1,10,8,.88)";
  context.lineWidth = 2;
  context.beginPath();
  if (eldritch) {
    context.ellipse(x, y, size * 0.43, size * 0.23, 0, 0, Math.PI * 2);
    context.fill(); context.stroke();
    context.fillStyle = theme.colors.primary;
    context.beginPath(); context.ellipse(x, y, size * 0.09, size * 0.2, 0, 0, Math.PI * 2); context.fill();
  } else {
    context.moveTo(x, y + size * 0.34); context.quadraticCurveTo(x - size * 0.05, y - size * 0.1, x, y - size * 0.34);
    context.moveTo(x, y - size * 0.05); context.quadraticCurveTo(x - size * 0.32, y - size * 0.18, x - size * 0.25, y + size * 0.08);
    context.moveTo(x, y + size * 0.07); context.quadraticCurveTo(x + size * 0.31, y - size * 0.08, x + size * 0.22, y + size * 0.17);
    context.stroke();
  }
  context.restore();
}

function drawUmbilicalCord(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  bend: number,
  color: string,
  time: number,
  pid: number,
  opacity: number,
  selected: boolean
) {
  const control1X = (startX + endX) / 2 + bend;
  const control2X = (startX + endX) / 2 - bend;
  const pulse = 0.82 + Math.sin(time * 0.002 + pid) * 0.18;
  const trace = () => {
    context.beginPath();
    context.moveTo(startX, startY);
    context.bezierCurveTo(control1X, startY, control2X, endY, endX, endY);
  };

  context.save();
  context.globalAlpha *= opacity;
  context.lineCap = "round";
  context.shadowColor = "rgba(120,12,54,.55)";
  context.shadowBlur = 7;
  context.strokeStyle = "rgba(38,4,20,.82)";
  context.lineWidth = selected ? 7 : 5;
  trace(); context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = withAlpha(color, 0.34 * pulse);
  context.lineWidth = selected ? 4.2 : 3.1;
  trace(); context.stroke();
  context.strokeStyle = "rgba(245,165,188,.24)";
  context.lineWidth = 0.75;
  context.setLineDash([2, 7]);
  context.lineDashOffset = -time * 0.012;
  trace(); context.stroke();
  context.setLineDash([]);

  for (let node = 1; node <= 3; node += 1) {
    const t = ((node / 4) + time * 0.000035) % 1;
    const mt = 1 - t;
    const x = mt ** 3 * startX + 3 * mt ** 2 * t * control1X + 3 * mt * t ** 2 * control2X + t ** 3 * endX;
    const y = mt ** 3 * startY + 3 * mt ** 2 * t * startY + 3 * mt * t ** 2 * endY + t ** 3 * endY;
    context.fillStyle = node % 2 ? withAlpha(color, 0.55) : "rgba(236,126,164,.55)";
    context.beginPath();
    context.ellipse(x, y, 2.3 * pulse, 1.35, t * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawConnectionSignal(context: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, bend: number, color: string, time: number, pid: number, emphasis: number) {
  const progress = (time * 0.00016 + (pid % 97) / 97) % 1;
  const remaining = 1 - progress;
  const x = remaining ** 3 * startX + 3 * remaining ** 2 * progress * ((startX + endX) / 2 + bend) + 3 * remaining * progress ** 2 * ((startX + endX) / 2 - bend) + progress ** 3 * endX;
  const y = remaining ** 3 * startY + 3 * remaining ** 2 * progress * startY + 3 * remaining * progress ** 2 * endY + progress ** 3 * endY;
  context.save();
  context.globalAlpha *= Math.sin(progress * Math.PI) * (0.3 + emphasis * 0.6);
  context.shadowColor = color;
  context.shadowBlur = 7;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, 1.4 + emphasis * 0.8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawEldritchSlime(
  context: CanvasRenderingContext2D,
  coreX: number,
  coreY: number,
  nodeX: number,
  nodeY: number,
  radius: number,
  progress: number,
  pid: number,
  inward: boolean
) {
  const strength = Math.sin(Math.min(1, progress) * Math.PI);
  if (strength <= 0.01) return;
  context.save();
  context.globalCompositeOperation = "screen";
  context.strokeStyle = `rgba(104, 220, 145, ${0.28 * strength})`;
  context.lineWidth = 1.2 + strength * 2.2;
  context.beginPath();
  context.moveTo(coreX, coreY + radius * 0.15);
  context.quadraticCurveTo((coreX + nodeX) / 2, Math.max(coreY, nodeY) + 22 * strength, nodeX, nodeY);
  context.stroke();
  for (let drop = 0; drop < 7; drop += 1) {
    let t = (drop / 7 + progress * (inward ? -1.3 : 1.1) + pid * 0.013) % 1;
    if (t < 0) t += 1;
    if (inward) t = 1 - t;
    const x = coreX + (nodeX - coreX) * t;
    const y = coreY + (nodeY - coreY) * t + Math.sin(t * Math.PI) * (12 + drop * 1.5);
    context.fillStyle = drop % 2 ? "rgba(118,244,164,.58)" : "rgba(176,252,197,.72)";
    context.beginPath();
    context.ellipse(x, y, 1.2 + strength * 1.5, 2.2 + strength * 2.8, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function GardenCanvas() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodePositions = useRef<NodePosition[]>([]);
  const visualNodesRef = useRef(new Map<number, VisualNode>());
  const embryosRef = useRef(new AgentEmbryoScene());
  const clockRef = useRef(new SceneClock());
  const celestialClockRef = useRef(new CelestialClock());
  const coreMouthRef = useRef(0);
  const requestRenderRef = useRef<() => void>(() => {});
  const populationRef = useRef<number[]>([]);
  const [hoveredPid, setHoveredPid] = useState<number | null>(null);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const state = useAppStore();
  const reducedMotion = state.reducedMotion || systemReducedMotion;
  const processIcons = useProcessIconStore((iconState) => iconState.icons);
  const themes = useMemo(() => [...builtInThemes, ...state.customThemes], [state.customThemes]);
  const requestedTheme = themes.find((item) => item.id === state.themeId) ?? builtInThemes[0];
  const [theme, setTheme] = useState(requestedTheme);
  const [assetState, setAssetState] = useState<"loading" | "ready" | "error">(() => getCachedSceneAssets(theme) ? "ready" : "loading");
  const [assetRetry, setAssetRetry] = useState(0);
  const activeThemeRef = useRef(theme);
  activeThemeRef.current = theme;
  const transitionRef = useRef<{ canvas: HTMLCanvasElement; startedAt: number | null; backdrop: number[] } | null>(null);
  const backdropRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backdropOpacity = useRef([0, 0]);
  const visitedBackdrops = useRef(new Set<string>());
  visitedBackdrops.current.add(sceneAssetFamily(theme));

  useEffect(() => {
    let cancelled = false;
    setAssetState("loading");
    void loadSceneAssets(requestedTheme).then(() => {
      if (cancelled) return;
      setTheme(requestedTheme);
      setAssetState("ready");
    }, () => { if (!cancelled) setAssetState("error"); });
    return () => { cancelled = true; };
  }, [requestedTheme, assetRetry]);

  useEffect(() => () => {
    if (transitionRef.current) transitionRef.current.canvas.width = transitionRef.current.canvas.height = 0;
    transitionRef.current = null;
  }, []);
  const { processes, embryoFocusPid } = useMemo(() => {
    const query = state.searchQuery.trim().toLowerCase();
    const agentPids = new Set(state.snapshot.processes.filter(isAgentProcess).map((process) => process.pid));
    const visibleProcesses = state.snapshot.processes.filter((process) => !agentPids.has(process.parentPid ?? -1));
    const matches = (process: ProcessSnapshot) => process.name.toLowerCase().includes(query) || String(process.pid).includes(query);
    const matchingParents = new Set(query ? state.snapshot.processes.filter((process) => agentPids.has(process.parentPid ?? -1) && matches(process)).map((process) => process.parentPid) : []);
    const filtered = query ? visibleProcesses.filter((process) => matches(process) || matchingParents.has(process.pid)) : visibleProcesses;
    const baseLimit = state.displayMode === "wallpaper" ? 10 : (state.populationMode === "exact" ? 32 : 12);
    const limit = Math.max(6, Math.round(baseLimit * state.nodeDensity));
    const selected = state.snapshot.processes.find((process) => process.pid === state.selectedPid);
    const focusPid = selected && agentPids.has(selected.parentPid ?? -1) ? selected.parentPid! : state.selectedPid;
    const matchingChild = query ? state.snapshot.processes.find((process) => agentPids.has(process.parentPid ?? -1) && matches(process)) : undefined;
    return {
      processes: selectPopulation(filtered, populationRef.current, limit, focusPid),
      embryoFocusPid: query ? matchingChild?.pid ?? null : selected && agentPids.has(selected.parentPid ?? -1) ? selected.pid : null
    };
  }, [state.displayMode, state.nodeDensity, state.populationMode, state.searchQuery, state.snapshot.processes, state.selectedPid]);
  useEffect(() => { populationRef.current = processes.map((process) => process.pid); }, [processes]);

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!preference) return;
    const update = () => setSystemReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    Object.entries(processIcons).forEach(([key, dataUrl]) => {
      if (!dataUrl || processIconImageCache.has(key)) return;
      const image = new Image();
      processIconImageCache.set(key, image);
      image.onload = () => requestRenderRef.current();
      image.src = dataUrl;
    });
  }, [processIcons]);

  const renderState = useMemo(() => ({
    processes,
    allProcesses: state.snapshot.processes,
    snapshotAt: state.snapshot.timestamp,
    embryoFocusPid,
    animationFps: state.animationFps,
    displayMode: state.displayMode,
    hoveredPid,
    labelsAlwaysVisible: state.labelsAlwaysVisible,
    nodeDensity: state.nodeDensity,
    particlesEnabled: state.particlesEnabled,
    celestialCycleEnabled: state.celestialCycleEnabled,
    paused: state.paused,
    processStyleOverrides: state.processStyleOverrides,
    reducedMotion,
    searchQuery: state.searchQuery,
    selectedPid: state.selectedPid
  }), [processes, state.snapshot.processes, state.snapshot.timestamp, embryoFocusPid, state.animationFps, state.displayMode, hoveredPid, state.labelsAlwaysVisible, state.nodeDensity, state.particlesEnabled, state.celestialCycleEnabled, state.paused, state.processStyleOverrides, reducedMotion, state.searchQuery, state.selectedPid]);
  const renderStateRef = useRef(renderState);
  renderStateRef.current = renderState;
  useEffect(() => { requestRenderRef.current(); }, [renderState, assetState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let assets = getCachedSceneAssets(theme);
    let particleOpacity = 0;
    let habitatOpacity = 0;
    let pollinatorOpacity = 0;
    let frame = 0;
    let lastRenderedAt = 0;
    let lastSceneFrameAt = clockRef.current.time;
    let lastSnapshotAt: number | null = null;
    let lastAmbientTargets = "";
    let lastLive: typeof renderStateRef.current | null = null;
    let lastPaintedState: typeof renderStateRef.current | null = null;
    let dirty = true;
    let width = 0;
    let height = 0;
    let vignette: CanvasGradient | null = null;
    let layoutProcesses: ProcessSnapshot[] | null = null;
    let layoutTargets = new Map<number, NodePosition>();
    let layoutDirty = true;
    let disposed = false;
    let painted = false;
    if (!assets) void loadSceneAssets(theme).then((ready) => {
      if (!disposed) { assets = ready; requestRender(); }
    }, () => { /* The theme status provides an explicit, retryable error. */ });
    const visualNodes = visualNodesRef.current;
    let fontBody = '"Inter Variable", "Noto Sans SC", sans-serif';
    let fontMono = '"JetBrains Mono Variable", monospace';
    const labelTextCache = new Map<string, { text: string; width: number }>();
    const labelMotion = new LabelMotion();
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      const pixelWidth = Math.max(1, Math.floor(width * ratio));
      const pixelHeight = Math.max(1, Math.floor(height * ratio));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      vignette = context.createRadialGradient(width * 0.5, height * 0.47, Math.min(width, height) * 0.08, width * 0.5, height * 0.47, Math.max(width, height) * 0.65);
      vignette.addColorStop(0, withAlpha(theme.colors.primary, 0.07));
      vignette.addColorStop(0.42, "rgba(2,12,10,.08)");
      vignette.addColorStop(1, "rgba(0,4,4,.82)");
      layoutDirty = true;
      requestRender();
    };
    const render = (now: number) => {
      frame = 0;
      const live = renderStateRef.current;
      const { time } = clockRef.current.tick(now, live.paused || live.reducedMotion || document.hidden);
      if (document.hidden) return;
      if (!live.paused && !live.reducedMotion) frame = requestAnimationFrame(render);
      if (lastLive !== live) {
        dirty = true;
        lastLive = live;
        const css = getComputedStyle(document.documentElement);
        fontBody = css.getPropertyValue("--font-body").trim() || fontBody;
        fontMono = css.getPropertyValue("--font-mono").trim() || fontMono;
        labelTextCache.clear();
      }
      if ((live.paused || live.reducedMotion) && !dirty) return;
      const targetFps = live.reducedMotion ? Math.min(30, live.animationFps) : live.animationFps;
      const frameDecision = decideAnimationFrame(lastRenderedAt, now, targetFps);
      if (!frameDecision.render) {
        if (!frame && dirty) frame = requestAnimationFrame(render);
        return;
      }
      lastRenderedAt = frameDecision.alignedTime;
      const deltaMs = Math.max(0, Math.min(100, time - lastSceneFrameAt));
      lastSceneFrameAt = time;
      const sampleChanged = lastSnapshotAt !== live.snapshotAt;
      lastSnapshotAt = live.snapshotAt;
      // Compare accepted paints, so a rate-limited frame cannot consume an interaction.
      const hadPaintedState = lastPaintedState !== null;
      const focusOrSearchChanged = lastPaintedState !== null && (
        lastPaintedState.searchQuery !== live.searchQuery ||
        lastPaintedState.selectedPid !== live.selectedPid ||
        lastPaintedState.hoveredPid !== live.hoveredPid ||
        lastPaintedState.embryoFocusPid !== live.embryoFocusPid ||
        lastPaintedState.labelsAlwaysVisible !== live.labelsAlwaysVisible
      );
      lastPaintedState = live;
      dirty = false;
      assets ??= getCachedSceneAssets(theme);
      const maskedCore = assets?.core ?? null;
      const maskedMaw = assets?.maw ?? null;
      const creatureVariants = assets?.creatureVariants ?? [];
      const habitatSprites = assets?.habitats ?? [];
      const pollinatorSprites = assets?.pollinators ?? [];
      const agentSprites = assets?.agents ?? [];
      const celestialSprites = assets?.celestial ?? [];
      context.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.47;
      const isEldritch = theme.id === "eldritch" || theme.basedOn === "eldritch";
      const coreRadius = Math.max(48, Math.min(isEldritch ? 82 : 74, Math.min(width, height) * (isEldritch ? 0.116 : 0.105)));
      if (vignette) { context.fillStyle = vignette; context.fillRect(0, 0, width, height); }

      const staticFrame = live.paused || live.reducedMotion;
      const celestialMode = live.paused || (live.reducedMotion && !sampleChanged) ? "freeze" : live.reducedMotion ? "settle" : "animate";
      const celestialCycle = celestialClockRef.current.sample(new Date(), deltaMs, celestialMode);
      if (live.displayMode === "wallpaper" && live.celestialCycleEnabled) {
        const offset = isEldritch ? 2 : 0;
        drawCelestialCycle(context, width, height, time, isEldritch, celestialCycle, celestialSprites[offset] ?? null, celestialSprites[offset + 1] ?? null);
      }

      const ambientTargets = `${live.particlesEnabled}:${habitatSprites.length}:${pollinatorSprites.length}`;
      if (!staticFrame || ambientTargets !== lastAmbientTargets) {
        particleOpacity = ambientVisibility(particleOpacity, live.particlesEnabled, deltaMs, staticFrame);
        habitatOpacity = ambientVisibility(habitatOpacity, live.particlesEnabled && habitatSprites.length === 4, deltaMs, staticFrame);
        pollinatorOpacity = ambientVisibility(pollinatorOpacity, live.particlesEnabled && pollinatorSprites.length === 4, deltaMs, staticFrame);
      }
      lastAmbientTargets = ambientTargets;
      if (particleOpacity > 0) {
        const count = Math.round(65 * theme.effects.particles * live.nodeDensity * (live.displayMode === "wallpaper" ? 0.55 : 1));
        for (let index = 0; index < count; index += 1) {
          const seed = index * 97.17;
          const x = (seed * 13.7 + time * 0.004 * ((index % 3) + 1)) % Math.max(width, 1);
          const y = (seed * 4.2 + Math.sin(time * 0.0004 + index) * 22 + height) % Math.max(height, 1);
          context.globalAlpha = (0.12 + (index % 5) * 0.025) * particleOpacity;
          context.fillStyle = index % 4 ? theme.colors.primary : theme.colors.secondary;
          context.beginPath(); context.arc(x, y, 0.7 + (index % 3) * 0.45, 0, Math.PI * 2); context.fill();
        }
        context.globalAlpha = 1;
      }

      if (habitatOpacity > 0 && habitatSprites.length === 4) {
        const habitatSize = Math.max(96, Math.min(178, Math.min(width, height) * 0.3));
        const habitats = [
          { x: width * 0.14, y: height * 0.27, rotation: -0.12, scale: 1.05 },
          { x: width * 0.86, y: height * 0.28, rotation: 0.08, scale: 0.96 },
          { x: width * 0.17, y: height * 0.74, rotation: 0.04, scale: 0.92 },
          { x: width * 0.83, y: height * 0.73, rotation: -0.06, scale: 0.98 }
        ];
        habitats.forEach((placement, index) => {
          context.save();
          context.translate(placement.x, placement.y);
          const habitatBreath = 1 + Math.sin(time * (isEldritch ? 0.00032 : 0.00042) + index * 1.71) * (isEldritch ? 0.018 : 0.026);
          context.rotate(placement.rotation + Math.sin(time * 0.00021 + index) * 0.018);
          context.scale(habitatBreath, 2 - habitatBreath);
          context.globalCompositeOperation = "screen";
          context.globalAlpha = ((isEldritch ? 0.29 : 0.2) + (index % 2) * 0.045 + Math.sin(time * 0.00033 + index) * 0.018) * habitatOpacity;
          const size = habitatSize * placement.scale;
          context.drawImage(habitatSprites[index], -size / 2, -size / 2, size, size);
          context.restore();
        });
      }

      const sameGeometry = layoutProcesses === live.processes || (layoutProcesses?.length === live.processes.length && live.processes.every((process, index) => {
        const previous = layoutProcesses![index];
        return process.pid === previous.pid && process.memoryBytes === previous.memoryBytes && process.cpuPercent === previous.cpuPercent;
      }));
      const viewportChanged = layoutDirty;
      const layoutChanged = layoutDirty || !sameGeometry;
      layoutProcesses = live.processes;
      if (layoutChanged) {
        const targets = live.processes.map((process) => {
          const angle = stableProcessAngle(process.pid);
          const ring = Math.abs(process.pid) % 3;
          const rx = Math.min(width * (0.25 + ring * 0.075), 340 + ring * 45);
          const ry = Math.min(height * (0.23 + ring * 0.055), 220 + ring * 40);
          const memoryMb = process.memoryBytes / 1024 ** 2;
          const densityScale = Math.min(1, Math.max(0.66, Math.sqrt(width * Math.max(120, height - 140) / Math.max(1, live.processes.length * 21_000))));
          return {
            pid: process.pid,
            x: cx + Math.cos(angle) * rx + Math.sin(angle * 3) * 15,
            y: cy + Math.sin(angle) * ry + Math.cos(angle * 2) * 11,
            radius: Math.max(12, Math.min(38, 10 + Math.log2(memoryMb + 1) * 2.2)) * (1 + process.cpuPercent / 250) * densityScale
          };
        });
        layoutTargets = new Map(separateSceneNodes(targets, { width, height, coreRadius }).map((node) => [node.pid, node]));
        layoutDirty = false;
      }
      const settleStaticState = staticFrame && (sampleChanged || layoutChanged);
      const visiblePids = new Set(live.processes.map((process) => process.pid));
      live.processes.forEach((process) => {
        const target = layoutTargets.get(process.pid)!;
        const drift = Math.sin(time * 0.00045 * theme.motion.drift + process.pid) * 5;
        const targetX = target.x + drift;
        const targetY = target.y + drift * 0.4;
        const targetRadius = target.radius;
        const existing = visualNodes.get(process.pid);
        if (existing) {
          if (existing.exiting) existing.bornAt = time - 1_450;
          existing.process = process;
          existing.targetX = targetX;
          existing.targetY = targetY;
          existing.targetRadius = targetRadius;
          existing.targetOpacity = 1;
          existing.lastSeenAt = time;
          existing.exiting = false;
        } else {
          const parent = visualNodes.get(process.parentPid ?? -1);
          const originX = parent?.x ?? cx;
          const originY = parent?.y ?? cy;
          visualNodes.set(process.pid, {
            pid: process.pid,
            process,
            x: live.reducedMotion || live.paused ? targetX : originX,
            y: live.reducedMotion || live.paused ? targetY : originY,
            radius: live.reducedMotion || live.paused ? targetRadius : Math.max(2, targetRadius * 0.16),
            targetX,
            targetY,
            targetRadius,
            opacity: live.reducedMotion || live.paused ? 1 : 0,
            targetOpacity: 1,
            displayCpu: 0,
            displayMemory: Math.min(process.memoryBytes, 8 * 1024 ** 2),
            bornAt: live.reducedMotion || live.paused ? time - 1_450 : time,
            lastSeenAt: time,
            transitionStartedAt: time,
            exitOriginX: originX,
            exitOriginY: originY,
            exitRadius: targetRadius,
            exitOpacity: 0,
            exiting: false,
            emphasis: 0,
            emphasisTarget: 0
          });
        }
      });

      visualNodes.forEach((node, pid) => {
        if (!visiblePids.has(pid)) {
          if (settleStaticState) { visualNodes.delete(pid); return; }
          if (!node.exiting) {
            node.exiting = true;
            node.transitionStartedAt = time;
            node.exitOriginX = node.x;
            node.exitOriginY = node.y;
            node.exitRadius = node.radius;
            node.exitOpacity = node.opacity;
            node.targetRadius = Math.max(2, node.radius * 0.22);
            node.targetX = isEldritch ? cx : damp(node.targetX, cx, 280, 900);
            node.targetY = isEldritch ? cy + Math.max(48, Math.min(82, Math.min(width, height) * 0.116)) * 0.22 : damp(node.targetY, cy, 280, 900);
          }
          const exitProgress = Math.min(1, (time - node.transitionStartedAt) / 1_500);
          node.targetOpacity = isEldritch ? node.exitOpacity : node.exitOpacity * (1 - exitProgress);
        }
        const birthProgress = Math.min(1, (time - node.bornAt) / 1_450);
        if (settleStaticState) {
          node.x = node.targetX;
          node.y = node.targetY;
          node.radius = node.targetRadius;
          node.opacity = 1;
          node.displayCpu = node.process.cpuPercent;
          node.displayMemory = node.process.memoryBytes;
          node.bornAt = Math.min(node.bornAt, time - 1_450);
        } else if (isEldritch && node.exiting) {
          const swallow = getEldritchSwallowMotion(time - node.transitionStartedAt);
          const mouthX = cx;
          const mouthY = cy + coreRadius * 0.12;
          const deltaX = mouthX - node.exitOriginX;
          const deltaY = mouthY - node.exitOriginY;
          const distance = Math.max(1, Math.hypot(deltaX, deltaY));
          const perpendicularX = -deltaY / distance;
          const perpendicularY = deltaX / distance;
          const spiralAmplitude = (1 - swallow.suction) * Math.min(78, node.exitRadius * 2.8) * Math.sin(swallow.spiralTurns * Math.PI * 2);
          const lift = Math.sin(swallow.suction * Math.PI) * Math.min(86, distance * 0.22);
          node.x = node.exitOriginX + deltaX * swallow.suction + perpendicularX * spiralAmplitude;
          node.y = node.exitOriginY + deltaY * swallow.suction + perpendicularY * spiralAmplitude - lift;
          node.radius = node.exitRadius * swallow.nodeScale;
          node.opacity = node.exitOpacity * swallow.nodeOpacity;
        } else if (isEldritch && birthProgress < 1) {
          const expelled = 1 - Math.pow(1 - birthProgress, 3);
          const overshoot = Math.sin(birthProgress * Math.PI) * 0.08;
          const travel = Math.min(1, expelled + overshoot);
          node.x = cx + (node.targetX - cx) * travel;
          node.y = cy + (node.targetY - cy) * travel - Math.sin(birthProgress * Math.PI) * node.targetRadius * 1.7;
        } else {
          node.x = damp(node.x, node.targetX, deltaMs, node.exiting ? (isEldritch ? 360 : 720) : 460);
          node.y = damp(node.y, node.targetY, deltaMs, node.exiting ? (isEldritch ? 360 : 720) : 460);
        }
        if (!(isEldritch && node.exiting)) {
          node.radius = damp(node.radius, node.targetRadius, deltaMs, node.exiting ? 540 : 420);
          node.opacity = damp(node.opacity, node.targetOpacity, deltaMs, node.exiting ? 520 : 300);
        }
        node.displayCpu = damp(node.displayCpu, node.process.cpuPercent, deltaMs, 620);
        node.displayMemory = damp(node.displayMemory, node.process.memoryBytes, deltaMs, 760);
        const emphasis = live.selectedPid === pid || live.hoveredPid === pid ? 1 : 0;
        if (!staticFrame) node.emphasis = damp(node.emphasis, emphasis, deltaMs, emphasis ? 120 : 220);
        else if (emphasis !== node.emphasisTarget) node.emphasis = emphasis;
        node.emphasisTarget = emphasis;
        if (node.exiting && time - node.transitionStartedAt > (isEldritch ? ELDRITCH_SWALLOW_DURATION_MS + 80 : 1_800) && node.opacity < 0.035) visualNodes.delete(pid);
      });

      const renderNodes = [...visualNodes.values()].filter((node) => node.opacity > 0.008);
      const embryoNodes = agentSprites.length === 4 ? embryosRef.current.update({
        processes: live.allProcesses, snapshotAt: live.snapshotAt,
        parents: new Map([...visualNodes.values()].filter((node) => isAgentProcess(node.process)).map((node) => [node.pid, node])),
        time, deltaMs, width, height, core: { x: cx, y: cy + coreRadius * 0.12 },
        eldritch: isEldritch, frozen: staticFrame, limit: live.displayMode === "wallpaper" ? 2 : 3,
        preferredPid: live.embryoFocusPid
      }) : [];
      const renderEmbryos = embryoNodes.filter((node) => node.opacity > 0.008);
      nodePositions.current = [...renderNodes, ...renderEmbryos].filter((node) => !node.exiting && node.opacity > 0.2).map(({ pid, x, y, radius }) => ({ pid, x, y, radius: Math.max(10, radius) }));

      renderNodes.forEach((position) => {
        const process = { ...position.process, cpuPercent: position.displayCpu, memoryBytes: Math.round(position.displayMemory) };
        const parent = visualNodes.get(process.parentPid ?? -1);
        const target = parent ?? { x: cx, y: cy };
        const styleIndex = organismVisualIndex(resolveOrganismStyle(process, live.processStyleOverrides));
        const color = processColor(process, theme, isEldritch, styleIndex);
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, position.opacity));
        const connectionPulse = 0.88 + Math.sin(time * 0.0011 + process.pid) * 0.12;
        const bend = isEldritch ? Math.sin(process.pid * 4.3) * 38 : Math.cos(process.pid * 2.1) * 24;
        if (isEldritch) {
          drawUmbilicalCord(context, target.x, target.y, position.x, position.y, bend, color, time, process.pid, (live.selectedPid && live.selectedPid !== process.pid ? 0.42 : 0.82) * connectionPulse, live.selectedPid === process.pid);
          const birthProgress = Math.min(1, (time - position.bornAt) / 1_450);
          const exitProgress = getEldritchSwallowMotion(time - position.transitionStartedAt).progress;
          if (!position.exiting && birthProgress < 1) drawEldritchSlime(context, cx, cy, position.x, position.y, position.radius, birthProgress, process.pid, false);
          if (position.exiting) drawEldritchSlime(context, cx, cy, position.x, position.y, position.radius, exitProgress, process.pid, true);
        } else {
          context.globalAlpha *= (live.selectedPid && live.selectedPid !== process.pid ? 0.36 : 0.72) * connectionPulse;
          context.strokeStyle = color;
          context.lineWidth = live.selectedPid === process.pid ? 1.6 : 0.8;
          context.beginPath();
          context.moveTo(target.x, target.y);
          context.bezierCurveTo((target.x + position.x) / 2 + bend, target.y, (target.x + position.x) / 2 - bend, position.y, position.x, position.y);
          context.stroke();
          if (position.emphasis > 0.01 || process.cpuPercent > 2) {
            drawConnectionSignal(context, target.x, target.y, position.x, position.y, bend, color, time, process.pid, position.emphasis);
          }
        }
        context.restore();
      });

      // Consumed nodes own the recoil until their lifecycle has fully settled.
      const eldritchCoreMotion = isEldritch ? [...visualNodes.values(), ...embryoNodes].reduce((motion, node) => {
        if (node.exiting) {
          const swallow = getEldritchSwallowMotion(time - node.transitionStartedAt);
          return {
            mouthOpen: Math.max(motion.mouthOpen, swallow.mouthOpen),
            coreKick: Math.max(motion.coreKick, swallow.coreKick),
            shockwave: Math.max(motion.shockwave, swallow.shockwave),
            shockwaveRadius: swallow.shockwave > motion.shockwave ? swallow.shockwaveRadius : motion.shockwaveRadius
          };
        }
        const birthProgress = Math.min(1, (time - node.bornAt) / 1_450);
        return { ...motion, mouthOpen: Math.max(motion.mouthOpen, birthProgress < 1 ? Math.sin(birthProgress * Math.PI) * 0.78 : 0) };
      }, { mouthOpen: 0, coreKick: 0, shockwave: 0, shockwaveRadius: 0 }) : { mouthOpen: 0, coreKick: 0, shockwave: 0, shockwaveRadius: 0 };
      // Interruptions can change the desired mouth phase abruptly; the visible
      // jaw continues from its current pose, opening broadly and biting faster.
      coreMouthRef.current = !isEldritch || settleStaticState ? eldritchCoreMotion.mouthOpen
        : damp(coreMouthRef.current, eldritchCoreMotion.mouthOpen, deltaMs, eldritchCoreMotion.mouthOpen > coreMouthRef.current ? 95 : 55);
      eldritchCoreMotion.mouthOpen = coreMouthRef.current;
      if (!isEldritch) drawCore(context, cx, cy, coreRadius, theme, time, false, maskedCore);

      renderNodes.forEach((position, index) => {
        const process = { ...position.process, cpuPercent: position.displayCpu, memoryBytes: Math.round(position.displayMemory) };
        const style = resolveOrganismStyle(process, live.processStyleOverrides);
        const styleIndex = organismVisualIndex(style);
        const color = processColor(process, theme, isEldritch, styleIndex);
        const selected = live.selectedPid === process.pid;
        const variants = creatureVariants[styleIndex] ?? [];
        const creatureSprite = style === "agent" ? agentSprites[0] : variants[organismVariantIndex(process, variants.length)];
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, position.opacity));
        if (position.emphasis > 0.01) {
          context.save();
          context.globalAlpha *= position.emphasis * 0.65;
          context.strokeStyle = color;
          context.lineWidth = 1.1;
          context.beginPath();
          const focusRadius = position.radius * (1.5 + position.emphasis * 0.08);
          const focusAngle = time * 0.00013;
          context.arc(position.x, position.y, focusRadius, focusAngle, focusAngle + Math.PI * 0.8);
          context.stroke();
          context.beginPath();
          context.arc(position.x, position.y, focusRadius, focusAngle + Math.PI, focusAngle + Math.PI * 1.8);
          context.stroke();
          context.restore();
        }
        if (creatureSprite) drawRasterCreature(context, creatureSprite, process, position.x, position.y, position.radius, color, time, selected);
        else drawGlowCircle(context, position.x, position.y, position.radius * (selected ? 1.12 : 1), color, theme.effects.glow);
        context.save();
        if (!creatureSprite) {
          context.strokeStyle = selected ? theme.colors.text : withAlpha(color, 0.72);
          context.lineWidth = selected ? 2 : 1;
          context.beginPath(); context.arc(position.x, position.y, position.radius + (selected ? 5 : 2), 0, Math.PI * 2); context.stroke();
          drawCreatureDetails(context, process, position.x, position.y, position.radius, color, index, time, isEldritch);
        }
        if (time - position.bornAt < 1_450 && !position.exiting && !isEldritch) {
          const progress = Math.min(1, (time - position.bornAt) / 1_450);
          context.globalAlpha = (1 - progress) * 0.8;
          context.lineWidth = 1.4;
          context.strokeStyle = theme.colors.success;
          context.beginPath();
          context.arc(position.x, position.y, position.radius + 8 + progress * 28, 0, Math.PI * 2);
          context.stroke();
        }
        if (!creatureSprite) {
          const petals = isEldritch ? 7 : 5;
          for (let petal = 0; petal < petals; petal += 1) {
            const angle = petal / petals * Math.PI * 2 + time * 0.00015;
            context.globalAlpha = 0.38;
            context.beginPath(); context.arc(position.x + Math.cos(angle) * (position.radius + 4), position.y + Math.sin(angle) * (position.radius + 4), 2.2, 0, Math.PI * 2); context.fillStyle = color; context.fill();
          }
        }
        const identityRadius = Math.max(7.5, position.radius * (style === "agent" ? 0.28 : 0.34));
        drawProcessIdentity(context, process, processIconImageCache.get(processIconKey(process)), position.x, position.y, identityRadius, color, selected, isEldritch, time);
        context.restore();
        if (position.exiting && !isEldritch) {
          context.save();
          context.globalCompositeOperation = "screen";
          context.fillStyle = color;
          for (let particle = 0; particle < 7; particle += 1) {
            const angle = particle / 7 * Math.PI * 2 + process.pid;
            const distance = position.radius * (0.5 + (1 - position.opacity) * 1.7);
            context.globalAlpha = Math.max(0, position.opacity * (0.34 - particle * 0.025));
            context.beginPath();
            context.arc(position.x + Math.cos(angle) * distance, position.y + Math.sin(angle) * distance, 1.1 + (particle % 2) * 0.55, 0, Math.PI * 2);
            context.fill();
          }
          context.restore();
        }
        context.restore();
      });

      renderEmbryos.forEach((node) => {
        const parent = visualNodes.get(node.parentPid);
        const withdrawal = node.exiting && isEldritch ? getEldritchSwallowMotion(time - node.transitionStartedAt).suction : 0;
        const anchor = node.exiting ? {
          x: node.tetherOrigin.x + (cx - node.tetherOrigin.x) * withdrawal,
          y: node.tetherOrigin.y + (cy + coreRadius * 0.12 - node.tetherOrigin.y) * withdrawal
        } : parent;
        const color = theme.colors.secondary;
        const selected = live.selectedPid === node.pid || live.hoveredPid === node.pid;
        context.save();
        context.globalAlpha = node.opacity;
        if (anchor) {
          const bend = Math.sin(node.pid * 4.3) * 18;
          if (isEldritch) drawUmbilicalCord(context, anchor.x, anchor.y, node.x, node.y, bend, color, time, node.pid, 0.48, false);
          else {
            context.strokeStyle = withAlpha(color, 0.42);
            context.lineWidth = 0.8;
            context.beginPath();
            context.moveTo(anchor.x, anchor.y);
            context.quadraticCurveTo((anchor.x + node.x) / 2 + bend, (anchor.y + node.y) / 2 - 12, node.x, node.y);
            context.stroke();
          }
        }
        if (isEldritch) {
          const progress = node.exiting ? getEldritchSwallowMotion(time - node.transitionStartedAt).progress : Math.min(1, (time - node.bornAt) / EMBRYO_BIRTH_MS);
          if (progress < 1) drawEldritchSlime(context, cx, cy, node.x, node.y, node.radius, progress, node.pid, node.exiting);
        }
        node.weights.forEach((weight, stage) => {
          if (weight < 0.002) return;
          context.save();
          context.globalAlpha *= weight;
          drawRasterCreature(context, agentSprites[stage + 1], node.process, node.x, node.y, node.radius, color, time, selected);
          context.restore();
        });
        // A small identity badge leaves the generated embryo silhouette readable.
        context.globalAlpha *= Math.max(0, Math.min(1, (node.radius - 2) / 6));
        drawProcessIdentity(context, node.process, processIconImageCache.get(processIconKey(node.process)), node.x, node.y + node.radius * 0.95, Math.max(6.5, node.radius * 0.34), color, selected, isEldritch, time);
        context.restore();
      });

      if (isEldritch) {
        drawCore(context, cx, cy, coreRadius, theme, time, true, maskedCore, eldritchCoreMotion.mouthOpen, eldritchCoreMotion.coreKick, maskedMaw);
        if (eldritchCoreMotion.shockwave > 0.01) {
          context.save();
          context.globalCompositeOperation = "screen";
          context.globalAlpha = eldritchCoreMotion.shockwave * 0.72;
          context.strokeStyle = theme.colors.danger;
          context.lineWidth = 2.2;
          context.beginPath();
          context.arc(cx, cy, coreRadius * (1.1 + eldritchCoreMotion.shockwaveRadius * 1.8), 0, Math.PI * 2);
          context.stroke();
          context.strokeStyle = theme.colors.primary;
          context.lineWidth = 0.9;
          context.beginPath();
          context.arc(cx, cy, coreRadius * (1.45 + eldritchCoreMotion.shockwaveRadius * 2.5), 0, Math.PI * 2);
          context.stroke();
          context.restore();
        }
      }

      if (pollinatorOpacity > 0 && pollinatorSprites.length === 4) {
        const pollinatorCount = live.displayMode === "wallpaper" ? 3 : 4;
        for (let index = 0; index < pollinatorCount; index += 1) {
          const pose = ambientFaunaPose(index, width, height, time, isEldritch);
          const { size } = pose;
          context.save();
          context.translate(pose.x, pose.y);
          context.rotate(pose.rotation);
          context.scale(pose.stretch, 2 - pose.stretch);
          context.globalCompositeOperation = "screen";
          context.globalAlpha = pose.alpha * pollinatorOpacity;
          context.drawImage(pollinatorSprites[index], -size / 2, -size / 2, size, size);
          context.restore();
        }
      }

      const allLabelNodes: SceneLabelNode[] = [...renderNodes, ...renderEmbryos];
      const occupied: LabelBox[] = allLabelNodes.filter((node) => !node.exiting).map((node) => ({ x: node.x - node.radius * 0.9, y: node.y - node.radius * 0.9, width: node.radius * 1.8, height: node.radius * 1.8 }));
      occupied.push({ x: cx - coreRadius, y: cy - coreRadius * 0.85, width: coreRadius * 2, height: coreRadius * 1.7 });
      const labelNodes = allLabelNodes.filter((node) => !node.exiting && (live.labelsAlwaysVisible || live.selectedPid === node.pid || live.hoveredPid === node.pid || node.radius > 24))
        .sort((a, b) => Number(b.pid === live.selectedPid) - Number(a.pid === live.selectedPid) || Number(b.pid === live.hoveredPid) - Number(a.pid === live.hoveredPid) || b.targetRadius - a.targetRadius || a.pid - b.pid);
      const placedLabels: { node: SceneLabelNode; label: { text: string; width: number }; box: LabelBox; focused: boolean }[] = [];
      const visibleLabelKeys = new Set<string>();
      labelNodes.forEach((node) => {
        const focused = live.selectedPid === node.pid || live.hoveredPid === node.pid;
        let label = labelTextCache.get(node.process.name);
        if (!label) {
          context.font = `600 11px ${fontBody}`;
          let text = node.process.name;
          while (text.length > 1 && context.measureText(text).width > 142) text = `${text.slice(0, -2)}…`;
          label = { text, width: Math.max(105, context.measureText(text).width + 16) };
          labelTextCache.set(node.process.name, label);
        }
        const key = `${node.pid}:${node.process.startedAt}`;
        const box = placeSceneLabel(node, label.width, { width, height, coreRadius }, occupied, focused || live.labelsAlwaysVisible, labelMotion.target(key));
        if (!box) return;
        occupied.push({ x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 });
        visibleLabelKeys.add(key);
        const visible = labelMotion.update(key, box, staticFrame ? 0 : deltaMs,
          settleStaticState || viewportChanged || live.reducedMotion || (staticFrame && focusOrSearchChanged), { width, height });
        placedLabels.push({ node, label, box: visible, focused });
      });
      labelMotion.retain(visibleLabelKeys);
      // Reserve focus space first, then paint it last when a dense scene has unavoidable overlap.
      placedLabels.reverse().forEach(({ node, label, box, focused }) => {
        const color = processColor(node.process, theme, isEldritch, organismVisualIndex(resolveOrganismStyle(node.process, live.processStyleOverrides)));
        context.save();
        context.globalAlpha = Math.max(0, Math.min(1, node.opacity)) * (focused ? 1 : 0.88);
        context.fillStyle = focused ? "rgba(3,15,13,.94)" : "rgba(1,8,8,.8)";
        context.strokeStyle = withAlpha(color, focused ? 0.55 : 0.23);
        context.lineWidth = 0.8;
        context.beginPath();
        context.roundRect(box.x, box.y, box.width, box.height, 6);
        context.fill();
        context.stroke();
        context.textAlign = "left";
        context.font = `600 11px ${fontBody}`;
        context.fillStyle = theme.colors.text;
        context.fillText(label.text, box.x + 8, box.y + 13);
        context.font = `9px ${fontMono}`;
        context.fillStyle = theme.colors.textMuted;
        context.fillText(`PID ${node.pid} · ${node.displayCpu.toFixed(1)}%`, box.x + 8, box.y + 26);
        context.restore();
      });

      const transition = transitionRef.current;
      let blend = 1;
      if (transition) {
        transition.startedAt ??= time;
        // Pausing alone preserves the composite. A later static data, layout or
        // focus change must replace the old picture so it cannot show stale actors.
        const settleTransition = staticFrame && hadPaintedState && (sampleChanged || layoutChanged || focusOrSearchChanged);
        const progress = settleTransition ? 1 : Math.min(1, Math.max(0, (time - transition.startedAt) / 500));
        blend = progress;
        if (progress < 1) {
          // Premultiplied crossfade: fade the new foreground, then add the
          // previous visible composite. A rapid reversal takes one fresh copy.
          context.save();
          context.globalCompositeOperation = "destination-in";
          context.globalAlpha = progress;
          context.fillStyle = "#000";
          context.fillRect(0, 0, width, height);
          context.globalCompositeOperation = "lighter";
          context.globalAlpha = 1 - progress;
          context.drawImage(transition.canvas, 0, 0, width, height);
          context.restore();
        } else {
          transition.canvas.width = transition.canvas.height = 0;
          transitionRef.current = null;
        }
      }
      backdropRefs.current.forEach((layer, index) => {
        const target = index === (isEldritch ? 1 : 0) ? 0.46 : 0;
        const from = transition?.backdrop[index] ?? target;
        const opacity = from + (target - from) * blend;
        if (layer && backdropOpacity.current[index] !== opacity) layer.style.opacity = String(opacity);
        backdropOpacity.current[index] = opacity;
      });
      painted = true;
    };
    function requestRender() {
      if (disposed) return;
      dirty = true;
      if (!frame) frame = requestAnimationFrame(render);
    }
    const visibilityChanged = () => {
      clockRef.current.tick(performance.now(), true);
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else requestRender();
    };
    requestRenderRef.current = requestRender;
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (activeThemeRef.current !== theme && painted) {
        const live = renderStateRef.current;
        const previous = transitionRef.current;
        transitionRef.current = null;
        if (!live.paused && !live.reducedMotion) {
          const copy = document.createElement("canvas");
          copy.width = canvas.width; copy.height = canvas.height;
          const copyContext = copy.getContext("2d");
          if (copyContext) {
            copyContext.drawImage(canvas, 0, 0);
            transitionRef.current = { canvas: copy, startedAt: null, backdrop: [...backdropOpacity.current] };
          }
        }
        if (previous) previous.canvas.width = previous.canvas.height = 0;
      }
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      requestRenderRef.current = () => {};
    };
  }, [theme]);

  const locate = (event: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    return hitTestScene(nodePositions.current, x, y);
  };
  const hoveredProcess = state.snapshot.processes.find((process) => process.pid === hoveredPid);

  return (
    <section className="garden-panel panel-surface" ref={containerRef} aria-busy={assetState === "loading"} data-scene-theme={theme.id} style={{ "--theme-background-image": `url("${sceneBackground(theme)}")` } as CSSProperties}>
      {builtInThemes.map((backdrop, index) => <div key={backdrop.id} className="canvas-backdrop" aria-hidden="true" ref={(element) => { backdropRefs.current[index] = element; }} style={{ backgroundImage: visitedBackdrops.current.has(backdrop.id) ? `linear-gradient(rgba(1,8,7,.30), rgba(1,8,7,.68)), url("${sceneBackground(backdrop)}")` : undefined }} />)}
      <div className="canvas-heading">
        <div><small>{t("garden.title")}</small><strong>{t("garden.subtitle")}</strong></div>
        <div className="canvas-tools">
          <div className="segmented-control compact"><button className={state.populationMode === "ecological" ? "active" : ""} onClick={() => state.setPopulationMode("ecological")}><Orbit size={13} />{t("garden.ecological")}</button><button className={state.populationMode === "exact" ? "active" : ""} onClick={() => state.setPopulationMode("exact")}><Boxes size={13} />{t("garden.exact")}</button></div>
          <button className="icon-button" onClick={() => state.setSelectedPid(null)} aria-label={t("garden.focusCore")} title={t("garden.focusCore")}><Focus size={15} /></button>
        </div>
      </div>
      {assetState !== "ready" && <div className="canvas-asset-status" role={assetState === "error" ? "alert" : "status"}>
        <span>{t(assetState === "error" ? "garden.assetError" : "garden.loadingTheme")}</span>
        {assetState === "error" && <button onClick={() => setAssetRetry((attempt) => attempt + 1)}>{t("garden.retryTheme")}</button>}
      </div>}
      <canvas ref={canvasRef} tabIndex={0} role="group" onPointerMove={(event) => setHoveredPid(locate(event))} onPointerLeave={() => setHoveredPid(null)} onClick={(event) => state.setSelectedPid(locate(event))} onKeyDown={(event) => {
        if (event.key === "Escape" && state.displayMode !== "windowed") return;
        if (event.key === "Escape" || event.key === "Home") { event.preventDefault(); state.setSelectedPid(null); return; }
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || !processes.length) return;
        event.preventDefault();
        const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        const selectable = nodePositions.current.length ? nodePositions.current : processes;
        const index = selectable.findIndex((process) => process.pid === state.selectedPid);
        const next = index < 0 ? (step > 0 ? 0 : selectable.length - 1) : (index + step + selectable.length) % selectable.length;
        state.setSelectedPid(selectable[next].pid);
      }} aria-label={t("garden.title")} />
      {processes.length === 0 && <div className="canvas-empty"><ScanSearch size={32} /><span>{t("garden.empty")}</span></div>}
      {hoveredProcess && <div className="canvas-tooltip"><strong>{hoveredProcess.name}</strong><span>PID {hoveredProcess.pid}</span><span>{formatPercent(hoveredProcess.cpuPercent, state.locale)} CPU · {formatBytes(hoveredProcess.memoryBytes, state.locale)}</span></div>}
      <div className="organism-dock" aria-label={t("status.searchResults", { count: processes.length })}>
        {processes.slice(0, 8).map((process) => <button key={process.pid} className={state.selectedPid === process.pid ? "active" : ""} aria-pressed={state.selectedPid === process.pid} onClick={() => state.setSelectedPid(process.pid)} onFocus={() => setHoveredPid(process.pid)} onBlur={() => setHoveredPid(null)} aria-label={t("a11y.selectProcess", { name: process.name })}><ProcessIcon process={process} className="dock-process-icon" /><small>{process.name}</small></button>)}
      </div>
    </section>
  );
}
