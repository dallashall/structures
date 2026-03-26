/**
 * Canvas2D Module - 2D canvas system with tool-based interactions
 *
 * Architecture:
 * - Canvas2D: Orchestrator — wires ViewState, Renderer, and Tools;
 *   resolves model→grid coordinates at data-change time (not render time)
 * - ViewState: Zoom, pan, coordinate conversions
 * - Canvas2DRenderer: Compositor — calls focused drawing functions
 * - GridBlock: Pre-resolved block type for rendering (zero conversions in render path)
 * - Drawing functions: drawGrid, drawBlocks, drawPreview, drawOverlays
 * - ToolBase / ClickDragReleaseTool / MultiClickTool: Interaction system (in src/core/tools/)
 * - ToolRegistry: Tool registration and hotkey lookup (in src/core/tools/)
 */

export { Canvas2D } from './Canvas2D';
