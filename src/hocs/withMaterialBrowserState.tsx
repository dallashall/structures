import React from 'react';
import { editorStateManager } from "../core/EditorStateManager";

export interface WithMaterialBrowserStateProps {
  isMaterialBrowserOpen: boolean;
  materialBrowserSearchQuery: string;
  materialBrowserSelectedTab: number;
}

/**
 * withMaterialBrowserState - HOC that provides material browser state
 *
 * Subscribes to EditorStateManager material browser state changes
 * including open/close, search query, and selected tab.
 */
export function withMaterialBrowserState<P extends object>(
  Component: React.ComponentType<P & WithMaterialBrowserStateProps>,
) {
  return function WithMaterialBrowserState(props: P) {
    const [isMaterialBrowserOpen, setIsMaterialBrowserOpen] = React.useState(
      editorStateManager.getMaterialBrowserOpen(),
    );
    const [searchQuery, setSearchQuery] = React.useState(
      editorStateManager.getMaterialBrowserSearchQuery(),
    );
    const [selectedTab, setSelectedTab] = React.useState(
      editorStateManager.getMaterialBrowserSelectedTab(),
    );

    React.useEffect(() => {
      const handleMaterialBrowserChange = (isOpen: boolean) => {
        setIsMaterialBrowserOpen(isOpen);
      };

      const handleSearchChange = (query: string) => {
        setSearchQuery(query);
      };

      const handleTabChange = (tab: number) => {
        setSelectedTab(tab);
      };

      editorStateManager.on(
        "materialbrowser:changed",
        handleMaterialBrowserChange,
      );
      editorStateManager.on(
        "materialbrowser:search:changed",
        handleSearchChange,
      );
      editorStateManager.on("materialbrowser:tab:changed", handleTabChange);

      return () => {
        editorStateManager.off(
          "materialbrowser:changed",
          handleMaterialBrowserChange,
        );
        editorStateManager.off(
          "materialbrowser:search:changed",
          handleSearchChange,
        );
        editorStateManager.off("materialbrowser:tab:changed", handleTabChange);
      };
    }, []);

    return (
      <Component
        {...props}
        isMaterialBrowserOpen={isMaterialBrowserOpen}
        materialBrowserSearchQuery={searchQuery}
        materialBrowserSelectedTab={selectedTab}
      />
    );
  };
}
