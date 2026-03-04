/**
 * Canvas2D Module - Modular 2D canvas system with proper separation of concerns
 *
 * Architecture:
 * - InteractionHandler: Generic input events (no domain knowledge)
 * - Controller: Domain logic orchestration
 * - Viewport, Renderer, PreviewManager, PaintHandler: Focused modules
 *
 * Exports:
 * - Canvas2DController (v3) - Main orchestrator with clean layering
 *
 * Internal modules (not exported):
 * - Canvas2DViewport - View state & coordinates
 * - Canvas2DRenderer - Pure rendering
 * - Canvas2DPreviewManager - Preview logic
 * - Canvas2DPaintHandler - Paint operations
 * - Canvas2DInteractionHandler - Generic input handling (no domain logic)
 */

export { Canvas2DController } from './Canvas2DControllerV3';
