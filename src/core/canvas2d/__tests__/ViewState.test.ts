/**
 * ViewState tests - fit-to-canvas, zoom clamping, and cursor-anchored zoom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project } from '../../../types';

const project = { dimensions: { width: 16, height: 16, depth: 16 } } as Project;
let cachedProject: Project | null = project;

const getCached = (): Project | null => cachedProject;

vi.mock('../../../projections/ProjectView', () => ({
  projectView: { getCached },
}));

const { ViewState } = await import('../ViewState');


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
