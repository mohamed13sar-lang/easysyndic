"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceResourceManager } from "@/components/resource-pages";

export default function SyndicApartmentsPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Appartements" subtitle="Gestion des lots par residence." />
      <ResidenceResourceManager
        title="les appartements"
        endpoint={(id) => `/syndic/residences/${id}/apartments`}
        create={{
          title: "Ajouter un appartement",
          submitLabel: "Creer",
          fields: [
            { name: "number", label: "Numero", required: true },
            { name: "block", label: "Bloc" },
            { name: "floor", label: "Etage", type: "number" },
            { name: "surface", label: "Surface", type: "number" },
            { name: "monthlyFee", label: "Cotisation", type: "number" },
          ],
        }}
        deleteEndpoint={(residenceId, row) => `/syndic/residences/${residenceId}/apartments/${row.id}`}
        statusEndpoint={(residenceId, row) => `/syndic/residences/${residenceId}/apartments/${row.id}/status`}
        columns={[
          { key: "number", header: "Numero", render: (row) => String(row.number ?? "-") },
          { key: "block", header: "Bloc", render: (row) => String(row.block ?? "-") },
          { key: "floor", header: "Etage", render: (row) => String(row.floor ?? "-") },
          { key: "monthlyFee", header: "Cotisation", render: (row) => row.monthlyFee ? `${String(row.monthlyFee)} MAD` : "-" },
          { key: "status", header: "Statut", render: (row) => String(row.isActive === false ? "Inactif" : "Actif") },
        ]}
      />
    </DashboardLayout>
  );
}
