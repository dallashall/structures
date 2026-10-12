import type { ToolBase } from "./ToolBase";
import type { ViewState } from "../canvas2d/ViewState";

interface ToolRegistration {
  /** Matches the PaintMode value for paint tools */
  name: string;
  /** Empty for no hotkey */
  hotkey: string;
  label: string;
  /** Each canvas gets its own tool instance */
  create: (
    canvas: HTMLCanvasElement,
    viewState: ViewState,
    requestRender: () => void,
  ) => ToolBase;
}

/**
 * ToolRegistry - The canvas tools, registered at module load
 *
 * Canvas2D creates tools by name. HotkeyDispatcher resolves hotkeys to tool names.
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
   * Replaces any registration with the same name, hotkey included
   */
  register(reg: ToolRegistration): void {
    const existing = this.tools.get(reg.name);
    if (existing && existing.hotkey) {
      this.hotkeyMap.delete(existing.hotkey);
    }

    this.tools.set(reg.name, reg);

    if (reg.hotkey) {
      this.hotkeyMap.set(reg.hotkey.toLowerCase(), reg.name);
    }
  }

  unregister(name: string): void {
    const reg = this.tools.get(name);
    if (reg) {
      if (reg.hotkey) {
        this.hotkeyMap.delete(reg.hotkey.toLowerCase());
      }
      this.tools.delete(name);
    }
  }

  getRegistration(name: string): ToolRegistration | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  /**
   * Hotkeys match lowercase
   */
  getByHotkey(key: string): string | undefined {
    return this.hotkeyMap.get(key.toLowerCase());
  }

  /**
   * Throws when no tool has that name
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
