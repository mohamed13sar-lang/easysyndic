import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { UsersList } from "@/components/resource-pages";

export default function SuperAdminUsersPage() {
  return (
    <DashboardLayout allowed="super-admin">
      <PageHeader title="Utilisateurs" subtitle="Liste globale des utilisateurs si l’endpoint backend est disponible." />
      <UsersList />
    </DashboardLayout>
  );
}
