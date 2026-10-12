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

// Pipeline manager keys. A new pipeline replaces any registered pipeline with the same name.
const SSAO_PIPELINE = 'ssao';
const DEFAULT_PIPELINE = 'default';

export interface PostProcessingPipelines {
  ssao: SSAO2RenderingPipeline | null;
  defaultPipeline: DefaultRenderingPipeline | null;
}

/**
 * Create post-processing pipelines based on render settings.
 * SSAO must be created before the default pipeline.
 */
function setupPostProcessing(
  scene: Scene,
  camera: Camera,
  settings: RenderSettings
): PostProcessingPipelines {
  let ssao: SSAO2RenderingPipeline | null = null;
  let defaultPipeline: DefaultRenderingPipeline | null = null;

  // 1. SSAO first (writes to GBuffer)
  if (settings.ssaoEnabled) {
    ssao = new SSAO2RenderingPipeline(SSAO_PIPELINE, scene, {
      ssaoRatio: 0.5,
      blurRatio: 0.5,
    });
    ssao.radius = settings.ssaoRadius;
    ssao.totalStrength = settings.ssaoIntensity;
    ssao.samples = settings.ssaoSamples;
    ssao.maxZ = 100;
    ssao.minZAspect = 0.5;
    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(SSAO_PIPELINE, camera);
  }

  // 2. Default pipeline second (bloom + tone mapping)
  defaultPipeline = new DefaultRenderingPipeline(DEFAULT_PIPELINE, true, scene, [camera]);

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
 * Replace the pipelines with ones built from new settings
 */
export function updatePostProcessing(
  current: PostProcessingPipelines | null,
  scene: Scene,
  camera: Camera,
  settings: RenderSettings
): PostProcessingPipelines {
  disposePostProcessing(current, scene);
  return setupPostProcessing(scene, camera, settings);
}

/**
 * Dispose the pipelines and unregister them from the scene.
 * SSAO2RenderingPipeline.dispose() detaches its cameras but stays registered. A disposed
 * pipeline left in the manager makes every later scene.render() throw.
 */
export function disposePostProcessing(pipelines: PostProcessingPipelines | null, scene: Scene): void {
  if (!pipelines) return;
  pipelines.ssao?.dispose();
  scene.postProcessRenderPipelineManager.removePipeline(SSAO_PIPELINE);
  pipelines.defaultPipeline?.dispose();
}
