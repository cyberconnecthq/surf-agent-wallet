import "./App.css";
import "./style.css";

import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";

// Set up polyfills before importing any other modules
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
  (window as any).global = window;

  // Set up process global
  (window as any).process = {
    env: {},
    version: "",
    versions: {},
    nextTick: (fn: any) => setTimeout(fn, 0),
    browser: true,
  };
}

import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
