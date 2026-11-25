import { createFileRoute } from "@tanstack/react-router";
import { WorklistScreen } from "@/screens/worklist/WorklistScreen";

export const Route = createFileRoute("/")({
  component: WorklistScreen,
});
