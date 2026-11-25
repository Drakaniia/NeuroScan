import { createFileRoute } from "@tanstack/react-router";
import { ExamsScreen } from "@/screens/exams/ExamsScreen";

export const Route = createFileRoute("/exams/")({
  component: ExamsScreen,
});
