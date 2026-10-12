import { describe, it, expect, beforeEach } from 'vitest';
import type { PaintOperation } from '../strategies/PaintStrategy';
import { editorState } from '../../EditorState';
import { OutlinePaintStrategy } from '../strategies/OutlinePaintStrategy';
import { CirclePaintStrategy } from '../strategies/CirclePaintStrategy';

const DIMENSIONS = { width: 16, height: 16, depth: 16 };
const FRONT_LAYER = { axis: 'y' as const, value: 4 };

const toY = ({ position }: PaintOperation): number => position.y;
const toX = ({ position }: PaintOperation): number => position.x;
const toZ = ({ position }: PaintOperation): number => position.z;
const isStone = ({ blockType }: PaintOperation): boolean => blockType === 'stone';

const drag = (
  strategy: OutlinePaintStrategy | CirclePaintStrategy,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
): PaintOperation[] => {
  strategy.startDrag(from);
  const operations = strategy.calculateOperations(to, 'stone', DIMENSIONS, FRONT_LAYER);
  strategy.endDrag();
  return operations;
};

const spanOf = (values: number[]): [number, number] => [Math.min(...values), Math.max(...values)];

describe('drag shape strategies', () => {
  beforeEach(() => {
    editorState.setHeldModifiers({ shift: false, alt: false });
    editorState.setShapeFillMode('outline');
  });

  it('draws the rectangle on the view plane and keeps the layer axis fixed', () => {
    const operations = drag(new OutlinePaintStrategy(), { x: 2, y: 4, z: 2 }, { x: 6, y: 4, z: 4 });

    expect(new Set(operations.map(toY))).toEqual(new Set([4]));
    expect(spanOf(operations.map(toX))).toEqual([2, 6]);
    expect(spanOf(operations.map(toZ))).toEqual([2, 4]);
    expect(operations.every(isStone)).toBe(true);
  });

  it('squares the rectangle with Shift', () => {
    editorState.setHeldModifiers({ shift: true, alt: false });
    const operations = drag(new OutlinePaintStrategy(), { x: 2, y: 4, z: 2 }, { x: 6, y: 4, z: 4 });

    expect(spanOf(operations.map(toZ))).toEqual([2, 6]);
  });

  it('draws the rectangle from its center with Alt', () => {
    editorState.setHeldModifiers({ shift: false, alt: true });
    const operations = drag(new OutlinePaintStrategy(), { x: 8, y: 4, z: 8 }, { x: 10, y: 4, z: 9 });

    expect(spanOf(operations.map(toX))).toEqual([6, 10]);
    expect(spanOf(operations.map(toZ))).toEqual([7, 9]);
  });

  it('fits the circle tool ellipse to the drag box', () => {
    const operations = drag(new CirclePaintStrategy(), { x: 1, y: 4, z: 1 }, { x: 11, y: 4, z: 5 });

    expect(spanOf(operations.map(toX))).toEqual([1, 11]);
    expect(spanOf(operations.map(toZ))).toEqual([1, 5]);
  });

  it('draws a true circle around the press point with Shift and Alt', () => {
    editorState.setHeldModifiers({ shift: true, alt: true });
    const operations = drag(new CirclePaintStrategy(), { x: 8, y: 4, z: 8 }, { x: 11, y: 4, z: 9 });

    expect(spanOf(operations.map(toX))).toEqual([5, 11]);
    expect(spanOf(operations.map(toZ))).toEqual([5, 11]);
  });

  it('leaves out cells past the project bounds', () => {
    editorState.setHeldModifiers({ shift: false, alt: true });
    const operations = drag(new OutlinePaintStrategy(), { x: 1, y: 4, z: 1 }, { x: 4, y: 4, z: 4 });

    expect(spanOf(operations.map(toX))).toEqual([0, 4]);
  });
});
