import type { ProcessSnapshot } from "../types/system";

export function drawAppLogo(context: CanvasRenderingContext2D, image: HTMLImageElement | undefined, process: ProcessSnapshot, x: number, y: number, radius: number, selected: boolean) {
  context.save();
  if (selected) {
    context.strokeStyle = "#b4c5df"; context.lineWidth = 1.5;
    context.beginPath(); context.arc(x, y, radius + 7, 0, Math.PI * 2); context.stroke();
  }
  if (image?.complete && image.naturalWidth) {
    const size = radius * 1.65;
    const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
    context.drawImage(image, x - width / 2, y - height / 2, width, height);
  } else {
    context.fillStyle = "#edf0f5"; context.font = `600 ${Math.max(12, radius * 0.7)}px sans-serif`;
    context.textAlign = "center"; context.textBaseline = "middle";
    context.fillText(process.name.replace(/\.exe$/i, "").slice(0, 2).toUpperCase(), x, y);
  }
  context.restore();
}

export function drawCpu(context: CanvasRenderingContext2D, image: HTMLCanvasElement | null, x: number, y: number, radius: number, load: string, model?: string | null) {
  context.save();
  const size = radius * 3.6;
  if (image) context.drawImage(image, x - size / 2, y - size / 2, size, size);
  context.textAlign = "center"; context.textBaseline = "middle";
  context.fillStyle = image ? "#15191f" : "#edf0f5";
  context.font = "600 11px sans-serif";
  const label = model?.replace(/\((?:R|TM)\)|[®™]/gi, "").replace(/\s+/g, " ").trim() || "CPU";
  const lines: string[] = [];
  for (const word of label.split(" ")) {
    const last = lines.length - 1;
    if (last >= 0 && context.measureText(`${lines[last]} ${word}`).width <= radius * 1.7) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  const lineHeight = Math.min(14, radius * 1.1 / (lines.length + 1));
  const top = y - lines.length * lineHeight / 2;
  lines.forEach((line, index) => context.fillText(line, x, top + index * lineHeight, radius * 1.7));
  context.font = "12px monospace"; context.fillText(load, x, top + lines.length * lineHeight + 3);
  context.restore();
}
