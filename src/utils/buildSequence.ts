/**
 * Order and timing of the build animation, shared by the add-on script and the editor's preview
 *
 * The add-on script embeds these constants and a copy of toSequenceKey, and the tests run both copies
 * on the same inputs, so the game and the preview cannot drift apart.
 *
 * Offsets are Bedrock-style, relative to the meta block: dx east, dy up, dz south.
 */

export type AnimatedSequence = 'rise' | 'rippleOut' | 'rippleIn' | 'pop';

export const TICKS_PER_SECOND = 20;
// A cell glows this many ticks before its block lands
export const LEAD_TICKS = 16;
// Larger builds glow on a sample of cells, which keeps the particle count bounded
export const MAX_GLOWS = 3000;
// Sequence keys spread by up to this much, so blocks of one layer or ring land in shuffled order
export const JITTER = 1.6;
// "pop" lands at most this many blocks per tick, which keeps a large build under Java's default limit of
// 65,536 commands per tick
export const POP_BLOCKS_PER_TICK = 4096;

/**
 * Lower keys land first. `random` is a 0–1 draw.
 */
export function toSequenceKey(sequence: AnimatedSequence, dx: number, dy: number, dz: number, random: number): number {
  const jitter = random * JITTER;
  if (sequence === 'pop') return random;
  if (sequence === 'rise') return dy + jitter;
  const distance = Math.sqrt(dx * dx + dz * dz) + Math.abs(dy) * 0.5;
  return sequence === 'rippleIn' ? -distance + jitter : distance + jitter;
}

export function toDurationTicks(seconds: number): number {
  return Math.max(1, Math.round(seconds * TICKS_PER_SECOND));
}

/**
 * The tick the block at `rank` (0 lands first) starts to glow. It lands LEAD_TICKS later.
 */
export function toMarkTick(rank: number, count: number, durationTicks: number): number {
  return Math.floor((rank * durationTicks) / Math.max(1, count));
}

/**
 * The tick the block at `rank` starts to glow. "pop" glows every cell on the first tick.
 */
export function toGlowTick(sequence: AnimatedSequence, rank: number, count: number, durationTicks: number): number {
  return sequence === 'pop' ? 0 : toMarkTick(rank, count, durationTicks);
}

/**
 * The tick the block at `rank` lands, LEAD_TICKS after its glow. "pop" lands every block together,
 * POP_BLOCKS_PER_TICK at a time.
 */
export function toLandTick(sequence: AnimatedSequence, rank: number, count: number, durationTicks: number): number {
  if (sequence === 'pop') return LEAD_TICKS + Math.floor(rank / POP_BLOCKS_PER_TICK);
  return toMarkTick(rank, count, durationTicks) + LEAD_TICKS;
}

/**
 * Ticks from the first glow to the last landing
 */
export function toBuildTicks(sequence: AnimatedSequence, count: number, durationTicks: number): number {
  if (sequence === 'pop') return toLandTick(sequence, Math.max(0, count - 1), count, durationTicks);
  return durationTicks + LEAD_TICKS;
}

/**
 * Glow one in every this-many cells, so the total stays at or under MAX_GLOWS
 */
export function toGlowEvery(count: number): number {
  return Math.max(1, Math.ceil(count / MAX_GLOWS));
}

// Share of the way from a block's average color to white. Stone and dark wood average to dull grays,
// which read as smoke, not glow.
const GLOW_LIGHTEN = 0.4;

/**
 * The glow tint for a block's average color (0–1 channels), shared by the add-on particle and the preview
 */
export function toGlowTint([red, green, blue]: [number, number, number]): [number, number, number] {
  const lighten = (channel: number): number => 1 - (1 - channel) * (1 - GLOW_LIGHTEN);
  return [lighten(red), lighten(green), lighten(blue)];
}
