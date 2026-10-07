import { throttled } from '../utils/throttle';

// Gap between the pointer and the floating element's top-left corner, in CSS pixels
const POINTER_OFFSET = 10;
// One update per frame at 60fps
const MOVE_THROTTLE_MS = 16;

/**
 * PointerFollower - Keeps a floating element beside the mouse pointer
 *
 * mountFollower is a stable React ref callback, so React calls it only on mount and unmount.
 * It listens to mousemove exactly while the element is mounted, and moves the element
 * with a transform, which causes no layout reflow and no React re-render.
 */
class PointerFollower {
  private static instance: PointerFollower;
  private element: HTMLElement | null = null;

  private constructor() {}

  static getInstance(): PointerFollower {
    if (!PointerFollower.instance) {
      PointerFollower.instance = new PointerFollower();
    }
    return PointerFollower.instance;
  }

  private handleMouseMove = throttled((event: MouseEvent): void => {
    if (!this.element) return;
    const x = event.clientX + POINTER_OFFSET;
    const y = event.clientY + POINTER_OFFSET;
    this.element.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
  }, MOVE_THROTTLE_MS);

  readonly mountFollower = (element: HTMLElement | null): void => {
    if (element) {
      this.element = element;
      window.addEventListener('mousemove', this.handleMouseMove);
    } else {
      window.removeEventListener('mousemove', this.handleMouseMove);
      this.element = null;
    }
  };
}

export const pointerFollower = PointerFollower.getInstance();
