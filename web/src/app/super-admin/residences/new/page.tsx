import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceForm } from "@/components/forms";

export default function NewResidencePage() {
  return (
    <DashboardLayout allowed="super-admin">
      <PageHeader title="Créer une résidence" subtitle="Formulaire branché sur POST /residences." />
      <ResidenceForm />
    </DashboardLayout>
  );
}
