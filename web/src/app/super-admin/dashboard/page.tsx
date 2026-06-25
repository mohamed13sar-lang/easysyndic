import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { DashboardOverview, QuickActions } from "@/components/dashboard-overview";

export default function SuperAdminDashboardPage() {
  return (
    <DashboardLayout allowed="super-admin">
      <PageHeader title="Super Admin" subtitle="Vue globale plateforme: syndics, residences, residents et activite." />
      <DashboardOverview variant="super-admin" />
      <QuickActions variant="super-admin" />
    </DashboardLayout>
  );
}
