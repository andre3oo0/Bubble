import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize TanStack Query client
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

// Installable app + offline helplines page (public/sw.js). Production only, so the
// dev server never sits behind a worker.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app works the same without it, just no offline page
    });
  });
}
