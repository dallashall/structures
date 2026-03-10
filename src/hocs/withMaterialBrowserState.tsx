import React from 'react';
import { editorState } from "../core/EditorState";

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
      editorState.getMaterialBrowserOpen(),
    );
    const [searchQuery, setSearchQuery] = React.useState(
      editorState.getMaterialBrowserSearchQuery(),
    );
    const [selectedTab, setSelectedTab] = React.useState(
      editorState.getMaterialBrowserSelectedTab(),
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

      editorState.on(
        "materialbrowser:changed",
        handleMaterialBrowserChange,
      );
      editorState.on(
        "materialbrowser:search:changed",
        handleSearchChange,
      );
      editorState.on("materialbrowser:tab:changed", handleTabChange);

      return () => {
        editorState.off(
          "materialbrowser:changed",
          handleMaterialBrowserChange,
        );
        editorState.off(
          "materialbrowser:search:changed",
          handleSearchChange,
        );
        editorState.off("materialbrowser:tab:changed", handleTabChange);
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
