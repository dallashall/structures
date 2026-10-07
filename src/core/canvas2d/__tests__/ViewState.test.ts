/**
 * ViewState tests - fit-to-canvas and zoom clamping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project } from '../../../types';

const project = { dimensions: { width: 16, height: 16, depth: 16 } } as Project;
let cachedProject: Project | null = project;

const getCached = (): Project | null => cachedProject;

vi.mock('../../../projections/ProjectView', () => ({
  projectView: { getCached },
}));

// EditorState imports BlockRegistry, which fetches a JSON file that jsdom cannot resolve
const getActiveLayers = () => ({ x: 0, y: 0, z: 0 });

vi.mock('../../EditorState', () => ({
  editorState: { getActiveLayers },
}));

const { ViewState } = await import('../ViewState');
const { wheelZoomFactor, classifyWheel } = await import('../../../utils/wheelZoom');

const wheel = (deltaY: number, ctrlKey = false) => ({ deltaY, deltaMode: 0, ctrlKey });

describe('ViewState', () => {
  beforeEach(() => {
    cachedProject = project;
  });

  it('fits the grid inside the canvas with padding and centers it', () => {
    const view = new ViewState('front', 700, 350);

    // Height limits the fit: (350 - 80) / 16 cells
    expect(view.getCellSize()).toBeCloseTo(270 / 16);
    const gridSize = 16 * view.getCellSize();
    expect(view.getPan().x).toBeCloseTo((700 - gridSize) / 2);
    expect(view.getPan().y).toBeCloseTo(40);
  });

  it('re-fits on resize until the user zooms', () => {
    const view = new ViewState('front', 700, 350);
    view.setCanvasSize(700, 700);
    expect(view.getCellSize()).toBeCloseTo(620 / 16);

    view.applyZoom(1.1, 0, 0);
    const zoomed = view.getCellSize();
    view.setCanvasSize(400, 400);
    expect(view.getCellSize()).toBe(zoomed);
  });

  it('waits for a project before fitting', () => {
    cachedProject = null;
    const view = new ViewState('front', 700, 350);
    expect(view.getZoom()).toBe(1);

    cachedProject = project;
    view.fitIfUnadjusted();
    expect(view.getCellSize()).toBeCloseTo(270 / 16);
  });

  it('allows zooming out past MIN_ZOOM when a large grid needs it to fit', () => {
    cachedProject = { dimensions: { width: 256, height: 256, depth: 256 } } as Project;
    const view = new ViewState('front', 400, 400);
    const fitZoom = view.getZoom();
    expect(fitZoom).toBeLessThan(0.25);

    view.applyZoom(0.01, 0, 0);
    expect(view.getZoom()).toBeCloseTo(fitZoom);
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const view = new ViewState('front', 700, 350);
    const before = view.pixelToGrid(300, 200);
    view.applyZoom(1.5, 300, 200);
    expect(view.pixelToGrid(300, 200)).toEqual(before);
  });
});

describe('wheelZoomFactor', () => {
  it('caps one mouse notch at a 10% step', () => {
    expect(wheelZoomFactor(wheel(-100))).toBeCloseTo(Math.exp(0.1));
    expect(wheelZoomFactor(wheel(100))).toBeCloseTo(Math.exp(-0.1));
  });

  it('scales small trackpad deltas by distance, not event count', () => {
    const tenSmall = wheelZoomFactor(wheel(-5)) ** 10;
    const oneLarger = wheelZoomFactor(wheel(-50));
    expect(tenSmall).toBeCloseTo(oneLarger);
  });

  it('uses the pinch sensitivity when ctrlKey is set', () => {
    expect(wheelZoomFactor(wheel(-5, true))).toBeCloseTo(Math.exp(0.05));
  });

  it('converts line-mode deltas to pixels', () => {
    expect(wheelZoomFactor({ deltaY: -3, deltaMode: 1, ctrlKey: false })).toBeCloseTo(Math.exp(0.09));
  });
});

describe('classifyWheel', () => {
  const event = (deltaX: number, deltaY: number, ctrlKey = false, deltaMode = 0) => ({ deltaX, deltaY, ctrlKey, deltaMode });

  it('reads ctrlKey as a pinch', () => {
    expect(classifyWheel(event(0, 3.5, true))).toBe('pinch');
  });

  it('reads notch-sized vertical integer deltas and line mode as a mouse', () => {
    expect(classifyWheel(event(0, 100))).toBe('mouse');
    expect(classifyWheel(event(0, 3, false, 1))).toBe('mouse');
  });

  it('reads small, fractional, or two-axis deltas as a trackpad', () => {
    expect(classifyWheel(event(0, 12))).toBe('trackpad');
    expect(classifyWheel(event(0, 60.5))).toBe('trackpad');
    expect(classifyWheel(event(4, 120))).toBe('trackpad');
  });
});
