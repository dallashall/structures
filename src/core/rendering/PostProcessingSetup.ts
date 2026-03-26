/**
 * PostProcessingSetup - SSAO, bloom, and tone mapping pipelines
 *
 * Creates and manages Babylon.js post-processing pipelines:
 * - SSAO2RenderingPipeline (ambient occlusion, created first)
 * - DefaultRenderingPipeline (bloom + tone mapping, created second)
 *
 * Both are attached to the same camera and can coexist.
 */

import {
  SSAO2RenderingPipeline,
  DefaultRenderingPipeline,
  Scene,
  Camera,
} from '@babylonjs/core';

import type { RenderSettings } from '../../types';

export interface PostProcessingPipelines {
  ssao: SSAO2RenderingPipeline | null;
  defaultPipeline: DefaultRenderingPipeline | null;
}

/**
 * Create post-processing pipelines based on render settings.
 * SSAO must be created before the default pipeline.
 */
export function setupPostProcessing(
  scene: Scene,
  camera: Camera,
  settings: RenderSettings
): PostProcessingPipelines {
  let ssao: SSAO2RenderingPipeline | null = null;
  let defaultPipeline: DefaultRenderingPipeline | null = null;

  // 1. SSAO first (writes to GBuffer)
  if (settings.ssaoEnabled) {
    ssao = new SSAO2RenderingPipeline('ssao', scene, {
      ssaoRatio: 0.5,
      blurRatio: 0.5,
    });
    ssao.radius = settings.ssaoRadius;
    ssao.totalStrength = settings.ssaoIntensity;
    ssao.samples = settings.ssaoSamples;
    ssao.maxZ = 100;
    ssao.minZAspect = 0.5;
    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', camera);
  }

  // 2. Default pipeline second (bloom + tone mapping)
  defaultPipeline = new DefaultRenderingPipeline('default', true, scene, [camera]);

  defaultPipeline.bloomEnabled = settings.bloomEnabled;
  defaultPipeline.bloomWeight = settings.bloomIntensity;
  defaultPipeline.bloomThreshold = settings.bloomThreshold;
  defaultPipeline.bloomKernel = 32;
  defaultPipeline.bloomScale = 0.5;

  // FXAA (screen-space anti-aliasing on top of hardware MSAA)
  defaultPipeline.fxaaEnabled = settings.fxaaEnabled;

  defaultPipeline.imageProcessingEnabled = settings.toneMapping;
  if (settings.toneMapping) {
    defaultPipeline.imageProcessing.contrast = settings.contrast;
    defaultPipeline.imageProcessing.exposure = settings.exposure;
    defaultPipeline.imageProcessing.toneMappingEnabled = true;
    defaultPipeline.imageProcessing.toneMappingType = 1; // ACES
  }

  // Hardware MSAA samples (applied at engine level)
  const samples = settings.msaaSamples;
  if (defaultPipeline.samples !== samples) {
    defaultPipeline.samples = samples;
  }

  return { ssao, defaultPipeline };
}

/**
 * Update post-processing from new settings.
 * Disposes and recreates pipelines when features are toggled on/off;
 * updates parameters in-place when just tweaking values.
 */
export function updatePostProcessing(
  current: PostProcessingPipelines | null,
  scene: Scene,
  camera: Camera,
  settings: RenderSettings
): PostProcessingPipelines {
  // Dispose existing and recreate (simplest correct approach)
  disposePostProcessing(current);
  return setupPostProcessing(scene, camera, settings);
}

/**
 * Dispose all post-processing pipelines
 */
export function disposePostProcessing(pipelines: PostProcessingPipelines | null): void {
  if (!pipelines) return;
  pipelines.ssao?.dispose();
  pipelines.defaultPipeline?.dispose();
}
