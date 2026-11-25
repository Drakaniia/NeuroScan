import { createFileRoute } from "@tanstack/react-router";
import { AboutScreen } from "@/screens/about/AboutScreen";

export const Route = createFileRoute("/about")({
  component: AboutScreen,
});
