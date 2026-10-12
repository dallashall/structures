import React from 'react';
import { blockRegistry } from "../core/BlockRegistry";
import type { Block } from "../types";

/**
 * Props injected by withBlockRegistry HOC
 */
export interface WithBlockRegistryProps {
  blocks: Block[];
  getBlock: (blockId: string) => Block | null;
  searchBlocks: (query: string) => Block[];
}

/**
 * Higher-Order Component that subscribes to BlockRegistry events
 * and provides block catalog to wrapped component.
 *
 * Subscribes to:
 * - blocks:registered
 *
 * Injects props:
 * - blocks: Block[] - All available blocks
 * - getBlock: (blockId: string) => Block | null - Get block by ID
 * - searchBlocks: (query: string) => Block[] - Search blocks by name
 *
 * @example
 * const EnhancedComponent = withBlockRegistry(MyComponent);
 */
export function withBlockRegistry<P extends object>(
  Component: React.ComponentType<P & WithBlockRegistryProps>,
) {
  return function WithBlockRegistry(props: P) {
    const [blocks, setBlocks] = React.useState<Block[]>(
      blockRegistry.getAllBlocks(),
    );

    const subscribe = (): (() => void) => {
      const handleRegistryUpdated = (updatedBlocks: Block[]) => {
        setBlocks(updatedBlocks);
      };

      // Subscribe to events
      blockRegistry.on("blocks:registered", handleRegistryUpdated);

      // Cleanup
      const unsubscribe = (): void => {
        blockRegistry.off("blocks:registered", handleRegistryUpdated);
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    // Stable callback references
    const readBlock = (blockId: string) => blockRegistry.getBlock(blockId);
    const getBlock = React.useCallback(readBlock, []);

    const findBlocks = (query: string) => blockRegistry.searchBlocks(query);
    const searchBlocks = React.useCallback(findBlocks, []);

    return (
      <Component
        {...props}
        blocks={blocks}
        getBlock={getBlock}
        searchBlocks={searchBlocks}
      />
    );
  };
}
