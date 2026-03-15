/**
 * HTU ACCREDITATION MONITORING SYSTEM
 * Developed by: ICT Directorate
 * Year: 2026
 */

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { GoogleOAuthProvider } from '@react-oauth/google';

createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
        <App />
    </GoogleOAuthProvider>
);


console.log(
    "%c HTU ACCREDITATION MONITORING SYSTEM %c \n%c Developed by: ICT Directorate %c \n%c © 2026 %c",
    "background: #8b0000; color: #fff; font-size: 16px; font-weight: bold; padding: 4px; border-radius: 4px 4px 0 0;",
    "",
    "background: #fff; color: #8b0000; font-size: 14px; font-weight: bold; padding: 4px; border: 1px solid #8b0000;",
    "",
    "background: #8b0000; color: #fff; font-size: 12px; padding: 4px; border-radius: 0 0 4px 4px;",
    ""
);
