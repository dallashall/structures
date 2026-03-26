import type {
  Vector3D,
  ViewType,
  LayerState,
  DepthConfig,
  Dimensions,
} from "../../types";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";
import type { PaintBehavior } from "../painting/behaviors/PaintBehavior";
import { NormalBehavior } from "../painting/behaviors/NormalBehavior";
import { OnlyReplaceBehavior } from "../painting/behaviors/OnlyReplaceBehavior";
import { SelectiveReplaceBehavior } from "../painting/behaviors/SelectiveReplaceBehavior";
import { blockProjection } from "../../projections/BlockProjection";
import { editorState } from "../EditorState";

/**
 * PaintPipeline - Composable steps for transforming paint operations
 *
 * Extracted from CanvasPainter. Each step is a pure-ish static function
 * that tools compose explicitly:
 *
 *   strategy.calculateOperations()
 *     → PaintPipeline.applyDepth()
 *     → PaintPipeline.applyBehavior()
 *     → PaintPipeline.applyDeleteModifier()
 */
export class PaintPipeline {
  /**
   * Get the constrained axis for a view type.
   * Each 2D view constrains operations to a single plane.
   */
  static getConstrainedAxis(
    viewType: ViewType,
    activeLayers: LayerState,
  ): { axis: "x" | "y" | "z"; value: number } {
    switch (viewType) {
      case "front":
      case "back":
        return { axis: "y", value: activeLayers.y };
      case "left":
      case "right":
        return { axis: "x", value: activeLayers.x };
      case "top":
      case "bottom":
        return { axis: "z", value: activeLayers.z };
    }
  }

  /**
   * Expand operations along the depth axis based on depth configuration.
   *
   * Pre-fetches all blocks in collision range once for O(1) lookups
   * instead of O(operations * depth) queries.
   */
  static applyDepth(
    operations: PaintOperation[],
    constrainAxis: { axis: "x" | "y" | "z"; value: number },
    depthConfig: DepthConfig,
    dimensions: Dimensions,
    viewType: ViewType,
  ): PaintOperation[] {
    if (!depthConfig.enabled) return operations;

    const { axis, value: currentLayer } = constrainAxis;
    const direction = PaintPipeline.getDepthDirection(viewType);

    const getMaxForAxis = (ax: "x" | "y" | "z"): number => {
      switch (ax) {
        case "x":
          return dimensions.width;
        case "y":
          return dimensions.height;
        case "z":
          return dimensions.depth;
      }
    };
    const maxValue = getMaxForAxis(axis);

    // Pre-fetch collision blocks for until-collision mode
    let blockLookup: Set<string> | null = null;
    if (depthConfig.mode === "until-collision") {
      blockLookup = new Set<string>();
      const cachedBlocks = blockProjection.getCached();

      for (const operation of operations) {
        if (operation.blockType === null) continue;

        for (let i = 0; i < depthConfig.thickness; i++) {
          const layer = currentLayer + i * direction;
          if (layer < 0 || layer >= maxValue) break;

          const pos: Vector3D = { ...operation.position };
          pos[axis] = layer;

          const block = cachedBlocks.get(pos);
          if (block !== null) {
            blockLookup.add(`${pos.x},${pos.y},${pos.z}`);
          }
        }
      }
    }

    const expanded: PaintOperation[] = [];

    for (const operation of operations) {
      for (let i = 0; i < depthConfig.thickness; i++) {
        const layer = currentLayer + i * direction;
        if (layer < 0 || layer >= maxValue) break;

        const expandedPosition: Vector3D = { ...operation.position };
        expandedPosition[axis] = layer;

        if (
          depthConfig.mode === "until-collision" &&
          operation.blockType !== null &&
          blockLookup
        ) {
          const key = `${expandedPosition.x},${expandedPosition.y},${expandedPosition.z}`;
          if (blockLookup.has(key)) break;
        }

        expanded.push({
          position: expandedPosition,
          blockType: operation.blockType,
        });
      }
    }

    return expanded;
  }

  /**
   * Filter operations through behavior rules (synchronous).
   */
  static applyBehavior(
    operations: PaintOperation[],
    behavior: PaintBehavior,
  ): PaintOperation[] {
    const getBlock = (pos: Vector3D): string | null => {
      const blockData = blockProjection.getCached().get(pos);
      return blockData ? blockData.blockType : null;
    };
    return behavior.filterSync(operations, getBlock);
  }

  /**
   * Transform operations if delete mode is enabled.
   * In delete mode, operations target existing blocks for removal.
   * The blockType is set to the existing block type (for preview rendering).
   */
  static applyDeleteModifier(
    operations: PaintOperation[],
  ): PaintOperation[] {
    if (!editorState.getDeleteMode()) return operations;

    const cachedBlocks = blockProjection.getCached();
    const transformed: PaintOperation[] = [];

    for (const operation of operations) {
      const existingBlock = cachedBlocks.get(operation.position);
      if (existingBlock) {
        transformed.push({
          position: operation.position,
          blockType: existingBlock.blockType,
        });
      }
    }

    return transformed;
  }

  /**
   * Full pipeline: depth → behavior → delete modifier.
   * Reads current behavior from EditorState automatically.
   */
  static process(
    operations: PaintOperation[],
    viewType: ViewType,
    dimensions: Dimensions,
  ): PaintOperation[] {
    const activeLayers = editorState.getActiveLayers();
    const constrainAxis = PaintPipeline.getConstrainedAxis(
      viewType,
      activeLayers,
    );
    const depthConfig = editorState.getDepthConfig();
    const behavior = PaintPipeline.createBehavior();

    const afterDepth = PaintPipeline.applyDepth(
      operations,
      constrainAxis,
      depthConfig,
      dimensions,
      viewType,
    );
    const afterBehavior = PaintPipeline.applyBehavior(afterDepth, behavior);
    return PaintPipeline.applyDeleteModifier(afterBehavior);
  }

  /**
   * Create a PaintBehavior instance from the current EditorState setting.
   */
  static createBehavior(): PaintBehavior {
    switch (editorState.getPaintBehavior()) {
      case "normal":
        return new NormalBehavior();
      case "only-replace":
        return new OnlyReplaceBehavior();
      case "selective-replace":
        return new SelectiveReplaceBehavior();
      default:
        return new NormalBehavior();
    }
  }

  /**
   * Get the depth direction (away from camera) based on view type.
   * Returns +1 for increasing layer numbers, -1 for decreasing.
   */
  private static getDepthDirection(viewType: ViewType): number {
    switch (viewType) {
      case "front":
        return 1;
      case "back":
        return -1;
      case "left":
        return 1;
      case "right":
        return -1;
      case "top":
        return -1;
      case "bottom":
        return 1;
    }
  }
}
