import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { isNativeApp } from "./lib/native";
import { initRevenueCat } from "./lib/revenuecat";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

if (isNativeApp()) {
  initRevenueCat();
}

createRoot(document.getElementById("root")!).render(<App />);
