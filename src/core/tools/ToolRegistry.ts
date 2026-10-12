import type { ToolBase } from "./ToolBase";
import type { ViewState } from "../canvas2d/ViewState";

/**
 * A tool registration — everything needed to instantiate and identify a tool.
 */
interface ToolRegistration {
  /** Unique identifier (matches PaintMode values for paint tools) */
  name: string;
  /** Single-character hotkey, or empty string for no hotkey */
  hotkey: string;
  /** Human-readable label for UI */
  label: string;
  /** Factory: create a fresh tool instance bound to a canvas + view */
  create: (
    canvas: HTMLCanvasElement,
    viewState: ViewState,
    requestRender: () => void,
  ) => ToolBase;
}

/**
 * ToolRegistry - Singleton registry for all canvas tools
 *
 * Tools register at module load time. Canvas2D looks up and instantiates tools
 * by name. HotkeyDispatcher resolves hotkeys to tool names.
 *
 * Usage:
 *   toolRegistry.register({ name: 'point', hotkey: 'b', label: 'Point', create: ... });
 *   const tool = toolRegistry.createTool('point', canvas, viewState, requestRender);
 */
class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, ToolRegistration>();
  private hotkeyMap = new Map<string, string>();

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool. Overwrites any existing registration with the same name.
   */
  register(reg: ToolRegistration): void {
    // Remove old hotkey mapping if re-registering
    const existing = this.tools.get(reg.name);
    if (existing && existing.hotkey) {
      this.hotkeyMap.delete(existing.hotkey);
    }

    this.tools.set(reg.name, reg);

    if (reg.hotkey) {
      this.hotkeyMap.set(reg.hotkey.toLowerCase(), reg.name);
    }
  }

  /**
   * Unregister a tool by name.
   */
  unregister(name: string): void {
    const reg = this.tools.get(name);
    if (reg) {
      if (reg.hotkey) {
        this.hotkeyMap.delete(reg.hotkey.toLowerCase());
      }
      this.tools.delete(name);
    }
  }

  /**
   * Get a registration by name.
   */
  getRegistration(name: string): ToolRegistration | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools.
   */
  getAll(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  /**
   * Look up a tool name by hotkey character (lowercase).
   */
  getByHotkey(key: string): string | undefined {
    return this.hotkeyMap.get(key.toLowerCase());
  }

  /**
   * Create a tool instance by name.
   * Throws if the tool name is not registered.
   */
  createTool(
    name: string,
    canvas: HTMLCanvasElement,
    viewState: ViewState,
    requestRender: () => void,
  ): ToolBase {
    const reg = this.tools.get(name);
    if (!reg) {
      throw new Error(`Tool "${name}" is not registered`);
    }
    return reg.create(canvas, viewState, requestRender);
  }
}

export const toolRegistry = ToolRegistry.getInstance();

// ============================================================================
// Built-in tool registrations
// ============================================================================

import { PointPaintTool } from "./PointPaintTool";
import { FillPaintTool } from "./FillPaintTool";
import { OutlinePaintTool } from "./OutlinePaintTool";
import { CirclePaintTool } from "./CirclePaintTool";
import { ArchPaintTool } from "./ArchPaintTool";
import { CurvePaintTool } from "./CurvePaintTool";

type ToolFactory = ToolRegistration["create"];

const createPointTool: ToolFactory = (canvas, viewState, requestRender) =>
  new PointPaintTool(canvas, viewState, requestRender);
const createFillTool: ToolFactory = (canvas, viewState, requestRender) =>
  new FillPaintTool(canvas, viewState, requestRender);
const createOutlineTool: ToolFactory = (canvas, viewState, requestRender) =>
  new OutlinePaintTool(canvas, viewState, requestRender);
const createCircleTool: ToolFactory = (canvas, viewState, requestRender) =>
  new CirclePaintTool(canvas, viewState, requestRender);
const createArchTool: ToolFactory = (canvas, viewState, requestRender) =>
  new ArchPaintTool(canvas, viewState, requestRender);
const createCurveTool: ToolFactory = (canvas, viewState, requestRender) =>
  new CurvePaintTool(canvas, viewState, requestRender);

toolRegistry.register({
  name: "point",
  hotkey: "b",
  label: "Point",
  create: createPointTool,
});

toolRegistry.register({
  name: "fill",
  hotkey: "",
  label: "Fill",
  create: createFillTool,
});

toolRegistry.register({
  name: "outline",
  hotkey: "r",
  label: "Outline",
  create: createOutlineTool,
});

toolRegistry.register({
  name: "circle",
  hotkey: "o",
  label: "Circle",
  create: createCircleTool,
});

toolRegistry.register({
  name: "arch",
  hotkey: "g",
  label: "Arch",
  create: createArchTool,
});

toolRegistry.register({
  name: "curve",
  hotkey: "v",
  label: "Curve",
  create: createCurveTool,
});
