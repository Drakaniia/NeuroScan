import { createFileRoute } from "@tanstack/react-router";
import { ReportScreen } from "@/screens/report/ReportScreen";

export const Route = createFileRoute("/exams/$examId/report")({
  component: ReportRoute,
});

function ReportRoute() {
  const { examId } = Route.useParams();
  return <ReportScreen key={examId} examId={examId} />;
}
