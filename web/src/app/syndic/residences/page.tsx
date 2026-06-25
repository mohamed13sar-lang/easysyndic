import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidencesList } from "@/components/resource-pages";

export default function SyndicResidencesPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Mes résidences" subtitle="Résidences liées au syndic connecté." />
      <ResidencesList scope="syndic" />
    </DashboardLayout>
  );
}
