/**
 * LightingPresets - Coordinated lighting configurations
 *
 * Pure functions and preset data for day/night/cloudy lighting.
 * Adjusts hemisphere light, directional light, scene clear color,
 * environment intensity, emissive material scaling, and point light parameters.
 * Light colors come from SkyPresets, so the lights carry the same key/fill contrast as the baked sky.
 * Lights are found by name from the scene graph (no stored references).
 */

import { Color3, Color4, Scene } from "@babylonjs/core";
import type { HemisphericLight, DirectionalLight } from "@babylonjs/core";

import { SKY_PRESETS } from "./SkyPresets";

import type { LightingPreset } from "../../types";
import type { SkyColor } from "./SkyPresets";

// Share of the sky's fill hue in the hemispheric light. The rest is white, so ambient light
// tints the blocks without washing out their texture colors.
const HEMISPHERIC_TINT = 0.5;

interface LightingPresetConfig {
  hemisphericIntensity: number;
  // Brightness of the light bouncing up from the ground. Its hue comes from the sky's ground color.
  hemisphericGroundLevel: number;
  directionalIntensity: number;
  clearColor: Color4;
  environmentIntensity: number;
  emissiveScale: number;
  emissiveLightIntensity: number;
}

const PRESETS: Record<LightingPreset, LightingPresetConfig> = {
  day: {
    hemisphericIntensity: 0.9,
    hemisphericGroundLevel: 0.2,
    directionalIntensity: 1.5,
    clearColor: new Color4(0.5, 0.8, 0.9, 1.0),
    environmentIntensity: 0.9,
    emissiveScale: 0,
    emissiveLightIntensity: 0.0,
  },
  night: {
    hemisphericIntensity: 0.35,
    hemisphericGroundLevel: 0.05,
    directionalIntensity: 0.5,
    clearColor: new Color4(0.02, 0.02, 0.05, 1.0),
    environmentIntensity: 0.6,
    emissiveScale: 0.9,
    emissiveLightIntensity: 12.0,
  },
  cloudy: {
    hemisphericIntensity: 0.5,
    hemisphericGroundLevel: 0.13,
    directionalIntensity: 0.7,
    clearColor: new Color4(0.12, 0.15, 0.15, 1.0),
    environmentIntensity: 0.5,
    emissiveScale: 0.1,
    emissiveLightIntensity: 0.5,
  },
};

const toColor3 = (c: SkyColor): Color3 => new Color3(c.r, c.g, c.b);

// Same hue, brightest channel scaled to `level`
const withLevel = (c: SkyColor, level: number): Color3 => {
  const peak = Math.max(c.r, c.g, c.b);
  return toColor3(c).scale(peak > 0 ? level / peak : 0);
};

const multiply = (a: SkyColor, b: SkyColor): SkyColor => ({ r: a.r * b.r, g: a.g * b.g, b: a.b * b.b });

/**
 * Apply a lighting preset to the scene.
 * Finds lights by their established names ('light', 'dirLight').
 */
export function applyLightingPreset(
  scene: Scene,
  preset: LightingPreset,
): void {
  const config = PRESETS[preset];
  const sky = SKY_PRESETS[preset];

  const hemiLight = scene.getLightByName("light") as HemisphericLight | null;
  if (hemiLight) {
    hemiLight.intensity = config.hemisphericIntensity;
    const fillHue = withLevel(multiply(sky.zenith, sky.fillTint), 1);
    hemiLight.diffuse = Color3.Lerp(Color3.White(), fillHue, HEMISPHERIC_TINT);
    hemiLight.groundColor = withLevel(sky.ground, config.hemisphericGroundLevel);
  }

  const dirLight = scene.getLightByName("dirLight") as DirectionalLight | null;
  if (dirLight) {
    dirLight.intensity = config.directionalIntensity;
    dirLight.diffuse = toColor3(sky.sunColor);
  }

  scene.clearColor = config.clearColor;
  scene.environmentIntensity = config.environmentIntensity;
}

/**
 * Get the emissive color scale factor for the given preset.
 * Higher at night (emissive blocks glow more visibly in darkness).
 */
export function getEmissiveScale(preset: LightingPreset): number {
  return PRESETS[preset].emissiveScale;
}

/**
 * Get the PointLight intensity for luminous blocks in the given preset.
 */
export function getEmissiveLightIntensity(preset: LightingPreset): number {
  return PRESETS[preset].emissiveLightIntensity;
}
