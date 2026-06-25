import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { DashboardOverview, QuickActions, SyndicRecentActivity } from "@/components/dashboard-overview";

export default function SyndicDashboardPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Dashboard Syndic" subtitle="Pilotage des residences, paiements, reclamations et assemblees." />
      <DashboardOverview variant="syndic" />
      <QuickActions variant="syndic" />
      <SyndicRecentActivity />
    </DashboardLayout>
  );
}
