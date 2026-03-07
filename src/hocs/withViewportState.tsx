import React from 'react';
import { viewportManager } from "../core/ViewportManager";
import type { CameraState } from "../types";

export interface WithViewportStateProps {
  camera: CameraState;
}

/**
 * withViewportState HOC
 *
 * Provides 3D camera state to wrapped component.
 * Subscribes to ViewportManager events and updates on changes.
 */
export function withViewportState<P extends object>(
  Component: React.ComponentType<P & WithViewportStateProps>,
) {
  return function WithViewportState(props: P) {
    const [camera, setCamera] = React.useState<CameraState>(
      viewportManager.getCamera(),
    );

    React.useEffect(() => {
      const handleCameraChanged = (updatedCamera: CameraState) => {
        setCamera(updatedCamera);
      };

      viewportManager.on("camera:changed", handleCameraChanged);

      return () => {
        viewportManager.off("camera:changed", handleCameraChanged);
      };
    }, []);

    return <Component {...props} camera={camera} />;
  };
}
