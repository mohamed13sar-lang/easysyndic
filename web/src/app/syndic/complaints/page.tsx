"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceResourceManager, badgeForStatus } from "@/components/resource-pages";

export default function SyndicComplaintsPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Reclamations" subtitle="Suivi des demandes residents." />
      <ResidenceResourceManager
        title="les reclamations"
        endpoint={(id) => `/syndic/residences/${id}/complaints`}
        columns={[
          { key: "title", header: "Titre", render: (row) => String(row.title ?? "-") },
          { key: "category", header: "Categorie", render: (row) => String(row.category ?? "-") },
          { key: "priority", header: "Priorite", render: (row) => String(row.priority ?? "-") },
          { key: "status", header: "Statut", render: (row) => badgeForStatus(row.status) },
        ]}
      />
    </DashboardLayout>
  );
}
