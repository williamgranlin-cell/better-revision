import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/eb-garamond/600.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "./index.css";

// Initialize style preference before render to prevent flash
const stylePreference = localStorage.getItem("style-preference") || "vibrant";
document.documentElement.classList.add(`${stylePreference}-style`);

createRoot(document.getElementById("root")!).render(<App />);
