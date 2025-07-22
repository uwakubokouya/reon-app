import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SettingsProvider } from "./SettingsContext";


const root = createRoot(document.getElementById("root"));
root.render(
  <SettingsProvider>
    <App />
  </SettingsProvider>
);
