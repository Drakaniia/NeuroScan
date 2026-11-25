import { createFileRoute } from "@tanstack/react-router";
import { PatientDetailScreen } from "@/screens/patients/PatientDetailScreen";

export const Route = createFileRoute("/patients/$patientId")({
  component: PatientRoute,
});

function PatientRoute() {
  const { patientId } = Route.useParams();
  return <PatientDetailScreen key={patientId} patientId={patientId} />;
}
