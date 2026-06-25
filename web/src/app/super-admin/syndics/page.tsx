import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { PageAction, UsersList } from "@/components/resource-pages";

export default function SuperAdminSyndicsPage() {
  return (
    <DashboardLayout allowed="super-admin">
      <PageHeader title="Syndics" subtitle="Gestion des comptes syndic." action={<PageAction href="/super-admin/syndics/new" label="Créer syndic" />} />
      <UsersList role="SYNDIC" />
    </DashboardLayout>
  );
}
