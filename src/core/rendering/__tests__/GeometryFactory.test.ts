import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NullEngine, Scene, VertexBuffer } from '@babylonjs/core';
import { createSlabMesh } from '../GeometryFactory';

// Each face samples its own tile in a row of 0.1-wide tiles.
// Face 1 (-Z) holds a V-reversed rect, as the atlas builder writes it for the back slot.
const TILE = 0.1;
const tileUV = (index: number): { u0: number; v0: number; u1: number; v1: number } => ({
  u0: index * TILE, v0: 0, u1: (index + 1) * TILE, v1: TILE,
});
const FACE_UVS = [
  tileUV(0),
  { ...tileUV(1), v0: TILE, v1: 0 },
  tileUV(2),
  tileUV(3),
  tileUV(4),
  tileUV(5),
];

let engine: NullEngine;
let scene: Scene;

beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});

afterAll(() => {
  scene.dispose();
  engine.dispose();
});

interface EdgeUV {
  u: number[];
  v: number[];
}

/**
 * Tile-local UVs, as fractions of the tile, on the upper and lower edge of one side face
 */
function sampleFace(slabType: 'top' | 'bottom', face: number): { top: EdgeUV; bottom: EdgeUV } {
  const mesh = createSlabMesh(scene, slabType, FACE_UVS);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
  const uvs = mesh.getVerticesData(VertexBuffer.UVKind)!;
  mesh.dispose();

  const vertices = [0, 1, 2, 3].map(toVertexOf(face));
  const maxY = Math.max(...vertices.map(toY(positions)));
  const edge = (onTop: boolean): EdgeUV => {
    const onEdge = vertices.filter(isOnTop(positions, maxY, onTop));
    return {
      u: onEdge.map(toLocalU(uvs, face)),
      v: onEdge.map(toLocalV(uvs)),
    };
  };
  return { top: edge(true), bottom: edge(false) };
}

const round = (value: number): number => Math.round(value * 100) / 100;
const toVertexOf = (face: number) => (corner: number): number => face * 4 + corner;
const toY = (positions: ArrayLike<number>) => (vertex: number): number => positions[vertex * 3 + 1];
const isOnTop = (positions: ArrayLike<number>, maxY: number, onTop: boolean) =>
  (vertex: number): boolean => (positions[vertex * 3 + 1] === maxY) === onTop;
const toLocalU = (uvs: ArrayLike<number>, face: number) =>
  (vertex: number): number => round((uvs[vertex * 2] - face * TILE) / TILE);
const toLocalV = (uvs: ArrayLike<number>) => (vertex: number): number => round(uvs[vertex * 2 + 1] / TILE);

describe('createSlabMesh side faces', () => {
  it('samples the lower texture half on a bottom slab, with the texture upright', () => {
    // +Z and -Z run the texture's vertical along V. The texture's lower edge has the higher V.
    for (const face of [0, 1]) {
      const sample = sampleFace('bottom', face);
      expect(sample.top.v).toEqual([0.5, 0.5]);
      expect(sample.bottom.v).toEqual([1, 1]);
    }
    // ±X run it along U, with the texture's lower edge at U 0
    for (const face of [2, 3]) {
      const sample = sampleFace('bottom', face);
      expect(sample.top.u).toEqual([0.5, 0.5]);
      expect(sample.bottom.u).toEqual([0, 0]);
    }
  });

  it('samples the upper texture half on a top slab', () => {
    for (const face of [0, 1]) {
      const sample = sampleFace('top', face);
      expect(sample.top.v).toEqual([0, 0]);
      expect(sample.bottom.v).toEqual([0.5, 0.5]);
    }
    for (const face of [2, 3]) {
      const sample = sampleFace('top', face);
      expect(sample.top.u).toEqual([1, 1]);
      expect(sample.bottom.u).toEqual([0.5, 0.5]);
    }
  });
});
