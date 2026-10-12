import React from 'react';
import { blockRegistry } from "../core/BlockRegistry";
import type { Block } from "../types";

export interface WithBlockRegistryProps {
  blocks: Block[];
  getBlock: (blockId: string) => Block | null;
  searchBlocks: (query: string) => Block[];
}

/**
 * HOC that passes the block catalog. It re-renders on blocks:registered, which fires once the catalog fetch lands.
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

      blockRegistry.on("blocks:registered", handleRegistryUpdated);

      const unsubscribe = (): void => {
        blockRegistry.off("blocks:registered", handleRegistryUpdated);
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

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
