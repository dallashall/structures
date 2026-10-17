import type {
  Vector3D,
  ViewType,
  LayerState,
  DepthConfig,
  Dimensions,
  BlockStateProperties,
} from "../../types";
import type { PaintOperation } from "../painting/strategies/PaintStrategy";
import type { PaintBehavior } from "../painting/behaviors/PaintBehavior";
import { NormalBehavior } from "../painting/behaviors/NormalBehavior";
import { OnlyReplaceBehavior } from "../painting/behaviors/OnlyReplaceBehavior";
import { SelectiveReplaceBehavior } from "../painting/behaviors/SelectiveReplaceBehavior";
import type { BlockIndexReader } from "../BlockIndex";
import { blockProjection } from "../../projections/BlockProjection";
import { blockRegistry } from "../BlockRegistry";
import { editorState } from "../EditorState";
import { isDoorBlock } from "../shapes/DoorShape";

/**
 * PaintPipeline - Turns a strategy's cells into the operations a tool hands to DraftingService
 *
 * Order: applyDepth → applyBehavior → applyDeleteModifier → attachBlockState → pairDoorHalves.
 * process() runs all five with the settings in EditorState.
 */
export class PaintPipeline {
  /**
   * The view's depth axis, held at the active layer
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
   * Repeats each operation through `thickness` layers, moving away from the viewer.
   * In until-collision mode a placement stops at the first layer that already holds a block.
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

    // One pass collects the occupied cells, so the expansion below checks a Set instead of the projection
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
          blockState: operation.blockState,
        });
      }
    }

    return expanded;
  }

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
   * In delete mode, keeps only cells that hold a block, and gives each operation that block's type.
   * The preview draws the block being removed. DraftingService treats delete mode as removal.
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
          blockState: existingBlock.blockState,
        });
      }
    }

    return transformed;
  }

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
    const afterDelete = PaintPipeline.applyDeleteModifier(afterBehavior);
    const withState = PaintPipeline.attachBlockState(afterDelete);
    return PaintPipeline.pairDoorHalves(
      withState,
      blockProjection.getCached(),
      dimensions,
      editorState.getDeleteMode(),
    );
  }

  /**
   * Keeps the two halves of a door together:
   * - A door placement becomes a lower half plus an upper half in the cell above. The door is dropped when that
   *   cell is outside the model, holds a block that is not a door, or is another operation's target.
   * - Removing or replacing either half of a placed door also removes the other half.
   * In delete mode every operation is a removal, so the added removal carries the partner's block for the preview.
   */
  static pairDoorHalves(
    operations: PaintOperation[],
    blocks: BlockIndexReader,
    dimensions: Dimensions,
    deleteMode: boolean,
  ): PaintOperation[] {
    const keyOf = (position: Vector3D): string => `${position.x},${position.y},${position.z}`;
    const targeted = new Set(operations.map(toPosition).map(keyOf));

    const paired: PaintOperation[] = [];
    for (const operation of operations) {
      if (deleteMode || !operation.blockType || !isDoorBlock(operation.blockType)) {
        paired.push(operation);
        continue;
      }
      const above = { ...operation.position, z: operation.position.z + 1 };
      const blockAbove = blocks.get(above);
      if (above.z >= dimensions.depth) continue;
      if (blockAbove && !isDoorBlock(blockAbove.blockType)) continue;
      if (targeted.has(keyOf(above))) continue;
      paired.push({ ...operation, blockState: { ...operation.blockState, half: "lower" } });
      paired.push({ position: above, blockType: operation.blockType, blockState: { ...operation.blockState, half: "upper" } });
    }

    const written = new Set(paired.map(toPosition).map(keyOf));
    const partnerRemovals: PaintOperation[] = [];
    for (const operation of paired) {
      const door = blocks.get(operation.position);
      if (!door || !isDoorBlock(door.blockType)) continue;
      const offset = door.blockState?.half === "upper" ? -1 : 1;
      const partnerPosition = { ...operation.position, z: operation.position.z + offset };
      const partner = blocks.get(partnerPosition);
      if (!partner || partner.blockType !== door.blockType || written.has(keyOf(partnerPosition))) continue;
      written.add(keyOf(partnerPosition));
      partnerRemovals.push(deleteMode
        ? { position: partnerPosition, blockType: partner.blockType, blockState: partner.blockState }
        : { position: partnerPosition, blockType: null });
    }
    return paired.concat(partnerRemovals);
  }

  /**
   * Stores only what the user chose (facing, half, type), merged over the block's defaults.
   * Derived state such as stair shape and connections is computed on read by shapeCatalog.resolveBlockState().
   */
  static attachBlockState(
    operations: PaintOperation[],
  ): PaintOperation[] {
    const selectedBlockId = editorState.getSelectedBlock();
    if (!selectedBlockId) return operations;

    const block = blockRegistry.getBlock(selectedBlockId);
    if (!block?.hasBlockState) return operations;

    const activeState = editorState.getActiveBlockState();
    const defaultState = block.defaultState ?? {};
    const mergedState: BlockStateProperties = { ...defaultState, ...activeState };

    const attachState = (op: PaintOperation): PaintOperation => {
      if (!op.blockType) return op;
      return { ...op, blockState: mergedState };
    };
    return operations.map(attachState);
  }

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
   * +1 when layers away from the viewer have higher numbers, -1 when lower
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

const toPosition = (operation: PaintOperation): Vector3D => operation.position;
