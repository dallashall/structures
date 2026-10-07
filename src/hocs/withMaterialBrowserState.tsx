import React from 'react';
import { editorState } from "../core/EditorState";

export interface WithMaterialBrowserStateProps {
  isMaterialBrowserOpen: boolean;
  materialBrowserSearchQuery: string;
  materialBrowserSelectedTab: number;
  materialBrowserGrabbedBlockId: string | null;
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
    const [grabbedBlockId, setGrabbedBlockId] = React.useState(
      editorState.getMaterialBrowserGrabbedBlock(),
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

      const handleBlockGrabbed = (blockId: string) => {
        setGrabbedBlockId(blockId);
      };

      const handleBlockReleased = () => {
        setGrabbedBlockId(null);
      };

      editorState.on(
        "materialbrowser:toggled",
        handleMaterialBrowserChange,
      );
      editorState.on(
        "materialbrowser:search:entered",
        handleSearchChange,
      );
      editorState.on("materialbrowser:tab:switched", handleTabChange);
      editorState.on("materialbrowser:block:grabbed", handleBlockGrabbed);
      editorState.on("materialbrowser:block:released", handleBlockReleased);

      return () => {
        editorState.off(
          "materialbrowser:toggled",
          handleMaterialBrowserChange,
        );
        editorState.off(
          "materialbrowser:search:entered",
          handleSearchChange,
        );
        editorState.off("materialbrowser:tab:switched", handleTabChange);
        editorState.off("materialbrowser:block:grabbed", handleBlockGrabbed);
        editorState.off("materialbrowser:block:released", handleBlockReleased);
      };
    }, []);

    return (
      <Component
        {...props}
        isMaterialBrowserOpen={isMaterialBrowserOpen}
        materialBrowserSearchQuery={searchQuery}
        materialBrowserSelectedTab={selectedTab}
        materialBrowserGrabbedBlockId={grabbedBlockId}
      />
    );
  };
}
