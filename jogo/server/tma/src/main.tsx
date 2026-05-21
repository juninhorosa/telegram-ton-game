import React from "react";
import ReactDOM from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import App from "./App";
import "./styles/index.css";

// Initialize Telegram Web App
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#0a0a0f");
  tg.setBackgroundColor("#0a0a0f");
}

const manifestUrl = new URL("/tonconnect-manifest.json", window.location.href).toString();
const twaReturnUrl = window.location.href as `${string}://${string}`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl} actionsConfiguration={{ twaReturnUrl }}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
