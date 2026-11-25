import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { connectBackendEvents } from "@/lib/api/events";
import { createQueryClient } from "@/lib/api/queries";
import { SessionProvider } from "@/lib/session";
import { routeTree } from "./routeTree.gen";

const queryClient = createQueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: false,
  scrollRestoration: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  useEffect(() => connectBackendEvents(queryClient), []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <SessionProvider>
            <RouterProvider router={router} />
          </SessionProvider>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("The #root element is missing from index.html.");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
