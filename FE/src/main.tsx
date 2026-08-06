import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Montserrat — unified font for EN + VN (latin + vietnamese subsets)
import "@fontsource/montserrat/latin-400.css";
import "@fontsource/montserrat/latin-500.css";
import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-ext-400.css";
import "@fontsource/montserrat/latin-ext-500.css";
import "@fontsource/montserrat/latin-ext-600.css";
import "@fontsource/montserrat/latin-ext-700.css";
import "@fontsource/montserrat/latin-ext-800.css";
import "@fontsource/montserrat/vietnamese-400.css";
import "@fontsource/montserrat/vietnamese-500.css";
import "@fontsource/montserrat/vietnamese-600.css";
import "@fontsource/montserrat/vietnamese-700.css";
import "@fontsource/montserrat/vietnamese-800.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
