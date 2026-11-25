import { createFileRoute } from "@tanstack/react-router";
import { ExamWorkspaceScreen } from "@/screens/workspace/ExamWorkspaceScreen";

export const Route = createFileRoute("/exams/$examId/")({
  component: ExamRoute,
});

function ExamRoute() {
  const { examId } = Route.useParams();
  return <ExamWorkspaceScreen key={examId} examId={examId} />;
}
