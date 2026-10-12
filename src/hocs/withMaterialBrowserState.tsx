import React from 'react';

import type { Block } from '../types';

import { blockRegistry } from '../core/BlockRegistry';
import { editorState } from '../core/EditorState';

import { filterMaterials } from '../utils/materialCategories';

export interface WithMaterialBrowserStateProps {
  isOpen: boolean;
  // Current values, so the search field and tabs respond on every keystroke and click
  searchQuery: string;
  selectedTab: number;
  // Filtered with deferred copies of the query and tab. React renders them at low priority.
  results: Block[];
  // True while results still reflect an older query or tab
  isStale: boolean;
  gridWidth: number;
  onGridResize: (size: { width: number }) => void;
}

/**
 * HOC for the material browser. Typing never waits on the grid:
 * the grid filters with useDeferredValue copies of the query and tab.
 */
export function withMaterialBrowserState<P extends object>(
  Component: React.ComponentType<P & WithMaterialBrowserStateProps>,
) {
  return function WithMaterialBrowserState(props: P) {
    const [isOpen, setIsOpen] = React.useState(editorState.getMaterialBrowserOpen());
    const [searchQuery, setSearchQuery] = React.useState(editorState.getMaterialBrowserSearchQuery());
    const [selectedTab, setSelectedTab] = React.useState(editorState.getMaterialBrowserSelectedTab());
    const [pickableBlocks, setPickableBlocks] = React.useState<Block[]>(blockRegistry.getPickableBlocks());
    const [gridWidth, setGridWidth] = React.useState(0);

    const subscribe = (): (() => void) => {
      // Opening resets the query and tab without emitting their own events
      const handleToggled = (open: boolean): void => {
        setIsOpen(open);
        setSearchQuery(editorState.getMaterialBrowserSearchQuery());
        setSelectedTab(editorState.getMaterialBrowserSelectedTab());
      };
      const handleBlocksRegistered = (): void => setPickableBlocks(blockRegistry.getPickableBlocks());

      editorState.on('materialbrowser:toggled', handleToggled);
      editorState.on('materialbrowser:search:entered', setSearchQuery);
      editorState.on('materialbrowser:tab:switched', setSelectedTab);
      blockRegistry.on('blocks:registered', handleBlocksRegistered);
      const unsubscribe = (): void => {
        editorState.off('materialbrowser:toggled', handleToggled);
        editorState.off('materialbrowser:search:entered', setSearchQuery);
        editorState.off('materialbrowser:tab:switched', setSelectedTab);
        blockRegistry.off('blocks:registered', handleBlocksRegistered);
      };
      return unsubscribe;
    };
    React.useEffect(subscribe, []);

    const deferredQuery = React.useDeferredValue(searchQuery);
    const deferredTab = React.useDeferredValue(selectedTab);
    const filterResults = (): Block[] => filterMaterials(pickableBlocks, deferredQuery, deferredTab);
    const results = React.useMemo(filterResults, [pickableBlocks, deferredQuery, deferredTab]);
    const isStale = deferredQuery !== searchQuery || deferredTab !== selectedTab;

    const recordGridWidth = ({ width }: { width: number }): void => setGridWidth(width);
    const handleGridResize = React.useCallback(recordGridWidth, []);

    return (
      <Component
        {...props}
        isOpen={isOpen}
        searchQuery={searchQuery}
        selectedTab={selectedTab}
        results={results}
        isStale={isStale}
        gridWidth={gridWidth}
        onGridResize={handleGridResize}
      />
    );
  };
}
