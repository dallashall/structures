/**
 * A CSS "#rrggbb" or "rgb(a)(r, g, b, …)" color as 0–1 channels, or null when it is neither
 */
export function cssColorToRgb(css: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css);
  const parseHexByte = (part: string): number => parseInt(part, 16);
  const channels = hex ? hex.slice(1).map(parseHexByte) : css.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length < 3) return null;
  return [channels[0] / 255, channels[1] / 255, channels[2] / 255];
}
