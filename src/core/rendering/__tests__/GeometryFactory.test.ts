import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NullEngine, Scene, VertexBuffer, MeshBuilder, Vector4 } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import { createSlabMesh, createBoxModelMesh } from '../GeometryFactory';

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

interface Vertex {
  position: number[];
  normal: number[];
  uv: number[];
}

function readVertices(mesh: Mesh): Vertex[] {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
  const uvs = mesh.getVerticesData(VertexBuffer.UVKind)!;
  const vertices: Vertex[] = [];
  for (let i = 0; i < positions.length / 3; i++) {
    vertices.push({
      position: Array.from(positions.slice(i * 3, i * 3 + 3)).map(round),
      normal: Array.from(normals.slice(i * 3, i * 3 + 3)).map(round),
      uv: Array.from(uvs.slice(i * 2, i * 2 + 2)).map(roundFine),
    });
  }
  return vertices;
}

const roundFine = (value: number): number => Math.round(value * 10000) / 10000;
const vertexKey = (vertex: Vertex): string => `${vertex.position}|${vertex.normal}`;
const isPlusZFace = (vertex: Vertex): boolean => vertex.normal[2] === 1;
const isAlongBabylonZ = (vertex: Vertex): boolean => Math.abs(vertex.position[2]) === 0.5;

describe('createBoxModelMesh', () => {
  it('gives a full-cell box the same UVs as a textured cube', () => {
    const toVector4 = (uv: { u0: number; v0: number; u1: number; v1: number }): Vector4 =>
      new Vector4(uv.u0, uv.v0, uv.u1, uv.v1);
    const cube = MeshBuilder.CreateBox('cube', { size: 1, faceUV: FACE_UVS.map(toVector4) }, scene);
    const model = createBoxModelMesh(scene, 'model', [{ from: [0, 0, 0], to: [16, 16, 16] }], FACE_UVS);
    const expected = new Map(readVertices(cube).map(toKeyedUV));
    for (const vertex of readVertices(model)) {
      expect(vertex.uv).toEqual(expected.get(vertexKey(vertex)));
    }
    cube.dispose();
    model.dispose();
  });

  it('shows the matching part of the face texture on a box smaller than the cell', () => {
    // A 4-wide post through the cell center shows the middle quarter of the +Z face's tile
    const post = createBoxModelMesh(scene, 'post', [{ from: [6, 6, 0], to: [10, 10, 16] }], FACE_UVS);
    const frontUs = readVertices(post).filter(isPlusZFace).map(toLocalFaceU(0));
    expect(Math.min(...frontUs)).toBeCloseTo(6 / 16, 3);
    expect(Math.max(...frontUs)).toBeCloseTo(10 / 16, 3);
    post.dispose();
  });

  it('turns a box about a model axis', () => {
    // A bar along model x, turned 90° about model z, lies along model y, which is Babylon z
    const bar = createBoxModelMesh(scene, 'bar', [{
      from: [0, 7, 7], to: [16, 9, 9],
      rotation: { axis: 'z', angle: Math.PI / 2, origin: [8, 8, 8] },
    }]);
    expect(readVertices(bar).some(isAlongBabylonZ)).toBe(true);
    expect(Math.max(...readVertices(bar).map(toBabylonX))).toBeCloseTo(1 / 16, 2);
    bar.dispose();
  });
});

const toKeyedUV = (vertex: Vertex): [string, number[]] => [vertexKey(vertex), vertex.uv];
const toLocalFaceU = (face: number) => (vertex: Vertex): number => (vertex.uv[0] - face * TILE) / TILE;
const toBabylonX = (vertex: Vertex): number => vertex.position[0];
