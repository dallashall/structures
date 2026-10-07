/**
 * SkyPresets - Sky colors, sun placement, and contrast colors per lighting preset
 *
 * Two consumers read this file:
 * - scripts/generateEnvironments.ts imports it in Node to bake public/environment/<preset>.env.
 *   Node strips the types but cannot resolve runtime imports from here, so keep this file data-only.
 * - LightingPresets derives the scene light colors from it, so lights and sky share one palette.
 *
 * Directions are BabylonJS world space (Y-up), the space the scene lights live in.
 */

import type { LightingPreset } from '../../types';

export interface SkyColor {
  r: number;
  g: number;
  b: number;
}

export interface SkyPreset {
  zenith: SkyColor;
  horizon: SkyColor;
  ground: SkyColor;
  // Multipliers on the gradient. Key tints the half of the sky toward the sun, fill the half away from it.
  // The two must differ in hue: the contrast between them is what reads on the muted block materials.
  keyTint: SkyColor;
  fillTint: SkyColor;
  sunColor: SkyColor;
  // Peak radiance of the disc. Kept under 8 so the PBR highlight stays soft instead of clipping to white.
  sunIntensity: number;
  // Angular radius of the disc in radians
  sunSize: number;
  // Exponent and strength of the broad lobe around the disc that carries sun direction into rough surfaces
  haloPower: number;
  haloStrength: number;
  // Second light lobe. Its azimuth is measured from the sun's azimuth, its elevation from the horizon.
  glowColor: SkyColor;
  glowStrength: number;
  glowPower: number;
  glowAzimuthOffset: number;
  glowElevation: number;
}

// Travel direction of the directional light. The baked sun disc sits opposite it.
export const SUN_TRAVEL_DIRECTION = { x: -1, y: -2, z: -1 };

export const SKY_PRESETS: Record<LightingPreset, SkyPreset> = {
  // Gold sun against a saturated blue sky, over olive ground
  day: {
    zenith: { r: 0.22, g: 0.45, b: 0.85 },
    horizon: { r: 0.72, g: 0.86, b: 0.95 },
    ground: { r: 0.22, g: 0.24, b: 0.12 },
    keyTint: { r: 1.4, g: 1.15, b: 0.8 },
    fillTint: { r: 0.7, g: 0.88, b: 1.3 },
    sunColor: { r: 1.0, g: 0.9, b: 0.7 },
    sunIntensity: 6,
    sunSize: 0.05,
    haloPower: 6,
    haloStrength: 0.5,
    glowColor: { r: 1.0, g: 0.8, b: 0.55 },
    glowStrength: 0.15,
    glowPower: 4,
    glowAzimuthOffset: 0,
    glowElevation: 0.05,
  },
  // Cyan-silver moon against an indigo sky, with an amber glow low on the opposite horizon.
  // Every stop stays well above black: the darkest direction must still read as a color.
  night: {
    zenith: { r: 0.1, g: 0.12, b: 0.26 },
    horizon: { r: 0.2, g: 0.2, b: 0.34 },
    ground: { r: 0.12, g: 0.1, b: 0.12 },
    keyTint: { r: 0.9, g: 1.15, b: 1.5 },
    fillTint: { r: 0.9, g: 0.6, b: 1.3 },
    sunColor: { r: 0.75, g: 0.85, b: 1.0 },
    sunIntensity: 2.5,
    sunSize: 0.035,
    haloPower: 6,
    haloStrength: 0.35,
    glowColor: { r: 1.0, g: 0.55, b: 0.2 },
    glowStrength: 0.6,
    glowPower: 3,
    glowAzimuthOffset: Math.PI,
    glowElevation: 0.1,
  },
  // Pale silver light from above against warm sand bounce from the ground
  cloudy: {
    zenith: { r: 0.45, g: 0.48, b: 0.52 },
    horizon: { r: 0.62, g: 0.64, b: 0.66 },
    ground: { r: 0.2, g: 0.18, b: 0.14 },
    keyTint: { r: 1.15, g: 1.2, b: 1.35 },
    fillTint: { r: 1.15, g: 0.95, b: 0.75 },
    sunColor: { r: 0.8, g: 0.82, b: 0.9 },
    sunIntensity: 0.6,
    sunSize: 0.25,
    haloPower: 2,
    haloStrength: 0.6,
    glowColor: { r: 0.9, g: 0.75, b: 0.55 },
    glowStrength: 0.1,
    glowPower: 2,
    glowAzimuthOffset: Math.PI,
    glowElevation: 0.0,
  },
};

export function environmentUrl(preset: LightingPreset): string {
  return `/environment/${preset}.env`;
}
