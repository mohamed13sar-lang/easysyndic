import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { PageAction, ResidencesList } from "@/components/resource-pages";

export default function SuperAdminResidencesPage() {
  return (
    <DashboardLayout allowed="super-admin">
      <PageHeader title="Résidences" subtitle="Créer, éditer, activer ou désactiver les résidences." action={<PageAction href="/super-admin/residences/new" label="Créer" />} />
      <ResidencesList scope="super-admin" />
    </DashboardLayout>
  );
}
