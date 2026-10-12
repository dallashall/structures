/**
 * PBRCategoryMap - Metallic and roughness presets for blocks, chosen by substrings of the block name
 *
 * Categories are checked in order and the first substring match wins, so a name in two lists
 * (sea_lantern) takes the earlier one. Substrings also match inside longer names: 'stone' matches redstone_lamp.
 */

import type { PBRPreset } from '../../types';

interface PBRCategory {
  patterns: string[];
  preset: PBRPreset;
}

const CATEGORIES: PBRCategory[] = [
  {
    // Metal blocks: shiny, reflective
    patterns: ['iron_block', 'gold_block', 'copper', 'netherite_block', 'anvil', 'chain', 'lantern', 'hopper', 'cauldron', 'rail', 'heavy_weighted_pressure_plate', 'light_weighted_pressure_plate'],
    preset: { metallic: 0.8, roughness: 0.3, environmentIntensity: 1.2 },
  },
  {
    // Crystal/gem blocks: very smooth, slightly metallic
    patterns: ['diamond_block', 'emerald_block', 'lapis_block', 'amethyst', 'prismarine', 'sea_lantern'],
    preset: { metallic: 0.2, roughness: 0.1, environmentIntensity: 1.5 },
  },
  {
    // Glass: near-mirror smooth
    patterns: ['glass'],
    preset: { metallic: 0.05, roughness: 0.05, environmentIntensity: 1.8 },
  },
  {
    // Ice/packed ice: smooth and reflective
    patterns: ['ice', 'packed_ice', 'blue_ice', 'frosted_ice'],
    preset: { metallic: 0.1, roughness: 0.15, environmentIntensity: 1.4 },
  },
  {
    // Stone: rough, no metal
    patterns: ['stone', 'cobblestone', 'granite', 'diorite', 'andesite', 'deepslate', 'tuff', 'calcite', 'basalt', 'blackstone', 'obsidian', 'end_stone', 'purpur', 'brick', 'sandstone', 'quartz', 'smooth_stone', 'polished'],
    preset: { metallic: 0.0, roughness: 0.85, environmentIntensity: 0.6 },
  },
  {
    // Wood: very rough, organic
    patterns: ['planks', 'log', 'wood', 'stripped', 'bamboo', 'stem', 'hyphae', 'fence', 'door', 'trapdoor', 'sign', 'boat', 'crafting_table', 'chest', 'barrel', 'bookshelf', 'ladder', 'stairs'],
    preset: { metallic: 0.0, roughness: 0.95, environmentIntensity: 0.4 },
  },
  {
    // Earth: maximum roughness
    patterns: ['dirt', 'grass_block', 'podzol', 'mycelium', 'sand', 'gravel', 'clay', 'mud', 'soul_sand', 'soul_soil', 'farmland', 'coarse_dirt', 'rooted_dirt', 'path'],
    preset: { metallic: 0.0, roughness: 1.0, environmentIntensity: 0.3 },
  },
  {
    // Organic: rough, natural
    patterns: ['leaves', 'vine', 'moss', 'fern', 'grass', 'azalea', 'flower', 'dandelion', 'poppy', 'tulip', 'lily', 'rose', 'sunflower', 'cornflower', 'wither_rose', 'spore_blossom', 'dripleaf', 'kelp', 'seagrass', 'sugar_cane', 'cactus', 'melon', 'pumpkin', 'hay', 'mushroom', 'fungus', 'nether_wart', 'cocoa', 'sweet_berry', 'crop', 'wheat', 'carrot', 'potato', 'beetroot'],
    preset: { metallic: 0.0, roughness: 0.9, environmentIntensity: 0.5 },
  },
  {
    // Fabric: soft, diffuse
    patterns: ['wool', 'carpet', 'banner', 'bed', 'candle'],
    preset: { metallic: 0.0, roughness: 1.0, environmentIntensity: 0.3 },
  },
  {
    // Luminous: moderate roughness (emissive handled separately)
    patterns: ['glowstone', 'sea_lantern', 'shroomlight', 'froglight', 'redstone_lamp', 'jack_o_lantern', 'beacon', 'end_rod', 'torch', 'campfire', 'magma_block', 'crying_obsidian'],
    preset: { metallic: 0.0, roughness: 0.7, environmentIntensity: 0.5 },
  },
  {
    // Terracotta/concrete: slightly rough
    patterns: ['terracotta', 'concrete', 'glazed'],
    preset: { metallic: 0.0, roughness: 0.75, environmentIntensity: 0.5 },
  },
];

const DEFAULT_PRESET: PBRPreset = {
  metallic: 0.0,
  roughness: 0.7,
  environmentIntensity: 0.8,
};

export function resolvePBRCategory(blockId: string): PBRPreset {
  const name = blockId.toLowerCase().replace('minecraft:', '');

  for (const category of CATEGORIES) {
    const matchesPattern = (pattern: string) => name.includes(pattern);
    if (category.patterns.some(matchesPattern)) {
      return category.preset;
    }
  }

  return DEFAULT_PRESET;
}

const LUMINOUS_PATTERNS = [
  'glowstone', 'sea_lantern', 'shroomlight', 'froglight',
  'redstone_lamp', 'jack_o_lantern', 'beacon', 'end_rod',
  'torch', 'campfire', 'magma_block', 'crying_obsidian',
];

export function isLuminousBlock(blockName: string): boolean {
  const name = blockName.toLowerCase().replace('minecraft:', '');
  const matchesPattern = (pattern: string) => name.includes(pattern);
  return LUMINOUS_PATTERNS.some(matchesPattern);
}
