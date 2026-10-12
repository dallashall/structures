/**
 * PostProcessingSetup - SSAO, bloom, FXAA, and tone mapping on the view camera
 *
 * SSAO2RenderingPipeline must be created before DefaultRenderingPipeline.
 * SSAO reads Babylon's prepass renderer, which rebuilds when scene.activeCamera changes (see ThumbnailCapture).
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

function setupPostProcessing(
  scene: Scene,
  camera: Camera,
  settings: RenderSettings
): PostProcessingPipelines {
  let ssao: SSAO2RenderingPipeline | null = null;
  let defaultPipeline: DefaultRenderingPipeline | null = null;

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

  defaultPipeline = new DefaultRenderingPipeline(DEFAULT_PIPELINE, true, scene, [camera]);

  defaultPipeline.bloomEnabled = settings.bloomEnabled;
  defaultPipeline.bloomWeight = settings.bloomIntensity;
  defaultPipeline.bloomThreshold = settings.bloomThreshold;
  defaultPipeline.bloomKernel = 32;
  defaultPipeline.bloomScale = 0.5;

  defaultPipeline.fxaaEnabled = settings.fxaaEnabled;

  defaultPipeline.imageProcessingEnabled = settings.toneMapping;
  if (settings.toneMapping) {
    defaultPipeline.imageProcessing.contrast = settings.contrast;
    defaultPipeline.imageProcessing.exposure = settings.exposure;
    defaultPipeline.imageProcessing.toneMappingEnabled = true;
    // ImageProcessingConfiguration.TONEMAPPING_ACES
    defaultPipeline.imageProcessing.toneMappingType = 1;
  }

  const samples = settings.msaaSamples;
  if (defaultPipeline.samples !== samples) {
    defaultPipeline.samples = samples;
  }

  return { ssao, defaultPipeline };
}

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
