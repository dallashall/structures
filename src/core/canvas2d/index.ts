/**
 * Canvas2D Module - 2D canvas system with tool-based interactions
 *
 * Architecture:
 * - Canvas2D: Thin orchestrator wiring ViewState, Renderer, and Tools
 * - ViewState: Zoom, pan, coordinate conversions
 * - Canvas2DRenderer: Pure rendering
 * - ToolBase / ClickDragReleaseTool / MultiClickTool: Interaction system (in src/core/tools/)
 * - ToolRegistry: Tool registration and hotkey lookup (in src/core/tools/)
 */

export { Canvas2D } from './Canvas2D';
