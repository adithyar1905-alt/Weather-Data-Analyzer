import React from "react";
import { createRoot } from "react-dom/client";
import App from "./EnterpriseDashboard.jsx";
import "./tailwind.css";
import "./dashboard.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
