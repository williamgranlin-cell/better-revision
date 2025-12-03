import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize style preference before render to prevent flash
const stylePreference = localStorage.getItem("style-preference") || "vibrant";
document.documentElement.classList.add(`${stylePreference}-style`);

createRoot(document.getElementById("root")!).render(<App />);
