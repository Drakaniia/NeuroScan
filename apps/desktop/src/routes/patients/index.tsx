import { createFileRoute } from "@tanstack/react-router";
import { PatientsScreen } from "@/screens/patients/PatientsScreen";

export const Route = createFileRoute("/patients/")({
  component: PatientsScreen,
});
