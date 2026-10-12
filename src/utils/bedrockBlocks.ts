/**
 * The Java-to-Bedrock block table that scripts/buildBedrockBlocks.ts writes to public/data/bedrock-blocks.json
 */

import type { BedrockStateValue } from './mcstructure';

export type BedrockTableEntry = [name: string, states: Record<string, BedrockStateValue>];

export interface BedrockBlockTable {
  source: string;
  bedrockVersion: [number, number, number];
  // Java block ID -> Java state key -> Bedrock block
  blocks: Record<string, Record<string, BedrockTableEntry>>;
}

/**
 * Sorted "key=value" pairs joined by commas. Waterlogging is left out because the export never writes water.
 */
export function toJavaStateKey(properties: Record<string, string>): string {
  const isKept = ([key]: [string, string]): boolean => key !== 'waterlogged';
  const byKey = ([a]: [string, string], [b]: [string, string]): number => a.localeCompare(b);
  const toPair = ([key, value]: [string, string]): string => `${key}=${value}`;
  return Object.entries(properties).filter(isKept).sort(byKey).map(toPair).join(',');
}
