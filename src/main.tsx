import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { hotkeyDispatcher } from "./core/HotkeyDispatcher";
import { screenRouter } from "./core/ScreenRouter";
import { openProjectCommand } from "./commands/OpenProjectCommand";
import "./index.css";

// App-lifetime setup lives outside React, so no component needs effects for it
hotkeyDispatcher.initialize();

const showEditorIfReopened = (reopened: boolean): void => {
  if (reopened) screenRouter.showEditor();
};
void openProjectCommand.executeLastOpened().then(showEditorIfReopened);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find root element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
