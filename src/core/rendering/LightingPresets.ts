/**
 * LightingPresets - Coordinated lighting configurations
 *
 * Pure functions and preset data for day/night/cloudy lighting.
 * Adjusts hemisphere light, directional light, scene clear color,
 * environment intensity, emissive material scaling, and point light parameters.
 * Lights are found by name from the scene graph (no stored references).
 */

import { Color3, Color4, Scene } from "@babylonjs/core";
import type { HemisphericLight, DirectionalLight } from "@babylonjs/core";

import type { LightingPreset } from "../../types";

interface LightingPresetConfig {
  hemisphericIntensity: number;
  hemisphericGroundColor: Color3;
  directionalIntensity: number;
  directionalColor: Color3;
  clearColor: Color4;
  environmentIntensity: number;
  emissiveScale: number;
  emissiveLightIntensity: number;
}

const PRESETS: Record<LightingPreset, LightingPresetConfig> = {
  day: {
    hemisphericIntensity: 0.9,
    hemisphericGroundColor: new Color3(0.2, 0.2, 0.2),
    directionalIntensity: 1.5,
    directionalColor: new Color3(1.0, 0.95, 0.85),
    clearColor: new Color4(0.5, 0.8, 0.9, 1.0),
    environmentIntensity: 0.9,
    emissiveScale: -0.5,
    emissiveLightIntensity: 0.0,
  },
  night: {
    hemisphericIntensity: 0.1,
    hemisphericGroundColor: new Color3(0.02, 0.02, 0.05),
    directionalIntensity: 0.3,
    directionalColor: new Color3(0.6, 0.65, 0.8),
    clearColor: new Color4(0.02, 0.02, 0.05, 1.0),
    environmentIntensity: 0.2,
    emissiveScale: 0.5,
    emissiveLightIntensity: 5.0,
  },
  cloudy: {
    hemisphericIntensity: 0.5,
    hemisphericGroundColor: new Color3(0.12, 0.13, 0.13),
    directionalIntensity: 0.7,
    directionalColor: new Color3(0.8, 0.8, 0.85),
    clearColor: new Color4(0.12, 0.15, 0.15, 1.0),
    environmentIntensity: 0.5,
    emissiveScale: 0.1,
    emissiveLightIntensity: 0.5,
  },
};

/**
 * Apply a lighting preset to the scene.
 * Finds lights by their established names ('light', 'dirLight').
 */
export function applyLightingPreset(
  scene: Scene,
  preset: LightingPreset,
): void {
  const config = PRESETS[preset];

  const hemiLight = scene.getLightByName("light") as HemisphericLight | null;
  if (hemiLight) {
    hemiLight.intensity = config.hemisphericIntensity;
    hemiLight.groundColor = config.hemisphericGroundColor;
  }

  const dirLight = scene.getLightByName("dirLight") as DirectionalLight | null;
  if (dirLight) {
    dirLight.intensity = config.directionalIntensity;
    dirLight.diffuse = config.directionalColor;
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
