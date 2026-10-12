/**
 * CameraGestures - Maps pointer, wheel, and key input on the 3D canvas to CameraRig moves
 *
 * Drag:  left orbits. Right, middle, or Space+left pans.
 * Wheel: trackpad scroll orbits, Shift+scroll pans, pinch and mouse wheel zoom toward the cursor.
 * Keys:  Home frames the structure while the pointer is over the canvas.
 */

import { SHORTCUTS } from '../Shortcuts';
import { classifyWheel, wheelZoomFactor } from '../../utils/wheelZoom';

import type { CameraRig } from './CameraRig';
import { isModalOpen, isTypingTarget } from '../../utils/keyboardFocus';

// A trackpad gesture keeps this classification for this long after its last event.
// Fast flings report notch-sized deltas, which classifyWheel alone would read as a mouse.
const TRACKPAD_GESTURE_MS = 300;

const LEFT_BUTTON = 0;

type DragMode = 'orbit' | 'pan';

export class CameraGestures {
  private dragMode: DragMode | null = null;
  private lastX = 0;
  private lastY = 0;
  private isSpaceHeld = false;
  private isPointerOver = false;
  private lastTrackpadEventMs = -Infinity;

  constructor(private canvas: HTMLCanvasElement, private rig: CameraRig) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('pointerenter', this.handlePointerEnter);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('pointerenter', this.handlePointerEnter);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    const isPan = e.button !== LEFT_BUTTON || this.isSpaceHeld;
    this.dragMode = isPan ? 'pan' : 'orbit';
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
    this.updateCursor();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.dragMode) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.dragMode === 'pan') {
      this.rig.pan(dx, dy, this.canvas.clientHeight);
    } else {
      this.rig.orbitByDrag(dx, dy);
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.dragMode) return;
    this.dragMode = null;
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    this.updateCursor();
  };

  private handlePointerEnter = (): void => {
    this.isPointerOver = true;
    this.updateCursor();
  };

  private handlePointerLeave = (): void => {
    this.isPointerOver = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const now = performance.now();
    const isInTrackpadGesture = now - this.lastTrackpadEventMs < TRACKPAD_GESTURE_MS;
    const gesture = classifyWheel(e);

    if (gesture === 'pinch' || (gesture === 'mouse' && !isInTrackpadGesture)) {
      this.rig.zoomAt(wheelZoomFactor(e), e.offsetX, e.offsetY);
      return;
    }

    this.lastTrackpadEventMs = now;
    if (e.shiftKey) {
      // Some browsers move a Shift+scroll's vertical delta into deltaX
      this.rig.pan(-e.deltaX, -e.deltaY, this.canvas.clientHeight);
    } else {
      this.rig.orbitByScroll(e.deltaX, e.deltaY);
    }
  };

  private handleContextMenu = (e: MouseEvent): void => {
    // Right-drag pans, so the menu would open on every pan
    e.preventDefault();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isPointerOver || isTypingTarget(e.target) || isModalOpen()) return;

    if (e.code === 'Space') {
      // Prevents page scroll and activation of a focused button
      e.preventDefault();
      if (!e.repeat) {
        this.isSpaceHeld = true;
        this.updateCursor();
      }
      return;
    }

    if (e.key === SHORTCUTS.frameStructure) {
      e.preventDefault();
      this.rig.frameLastStructure();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code !== 'Space') return;
    this.isSpaceHeld = false;
    this.updateCursor();
  };

  private updateCursor(): void {
    if (this.dragMode === 'pan') {
      this.canvas.style.cursor = 'grabbing';
    } else if (this.isSpaceHeld) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = '';
    }
  }
}

