// import { StrictMode } from 'react'
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import 'bootstrap/dist/css/bootstrap.min.css';
// Only if you use Bootstrap’s JS components (Modal, Dropdown, Tooltip…)
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <App />
  // </StrictMode>,
);
