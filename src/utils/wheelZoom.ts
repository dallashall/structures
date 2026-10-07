// Zoom changes by exp(step) per wheel event, with step = -deltaY * sensitivity.
// A mouse notch reports ~100px and hits MAX_ZOOM_STEP (~10%). A trackpad sends
// many small deltas, so its total zoom tracks finger travel instead of event count.
const WHEEL_ZOOM_SENSITIVITY = 0.002;
// Pinch gestures arrive as wheel events with ctrlKey set and small deltas
const PINCH_ZOOM_SENSITIVITY = 0.01;
const MAX_ZOOM_STEP = 0.1;

export const wheelZoomFactor = (
  e: Pick<WheelEvent, "deltaY" | "deltaMode" | "ctrlKey">,
): number => {
  let delta = e.deltaY;
  if (e.deltaMode === 1) delta *= 15;
  else if (e.deltaMode === 2) delta *= 100;

  const sensitivity = e.ctrlKey ? PINCH_ZOOM_SENSITIVITY : WHEEL_ZOOM_SENSITIVITY;
  const step = Math.max(-MAX_ZOOM_STEP, Math.min(MAX_ZOOM_STEP, -delta * sensitivity));
  return Math.exp(step);
};

export type WheelGesture = "pinch" | "mouse" | "trackpad";

// Wheel events carry no device type, so these are heuristics:
// - pinch: browsers set ctrlKey on trackpad pinch gestures.
// - mouse: line or page deltaMode, or a vertical-only integer delta of at least
//   MOUSE_NOTCH_MIN_DELTA. One notch reports about 100px in Chrome and Safari.
// - trackpad: everything else. Fast trackpad flings can also exceed the threshold,
//   so callers should keep classifying as trackpad while a trackpad gesture is in progress.
const MOUSE_NOTCH_MIN_DELTA = 50;

export const classifyWheel = (
  e: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode" | "ctrlKey">,
): WheelGesture => {
  if (e.ctrlKey) return "pinch";
  if (e.deltaMode !== 0) return "mouse";

  const isVerticalOnly = e.deltaX === 0;
  const isNotchSized = Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= MOUSE_NOTCH_MIN_DELTA;
  return isVerticalOnly && isNotchSized ? "mouse" : "trackpad";
};
