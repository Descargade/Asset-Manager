import "./lib/api"; // 👈 PRIMERA LÍNEA SIEMPRE

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
