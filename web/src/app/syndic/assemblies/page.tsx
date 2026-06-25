"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceResourceManager, badgeForStatus } from "@/components/resource-pages";

export default function SyndicAssembliesPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Assemblees Generales" subtitle="AG, ordre du jour, presence et votes." />
      <ResidenceResourceManager
        title="les assemblees"
        endpoint={(id) => `/syndic/residences/${id}/assemblies`}
        create={{
          title: "Planifier une assemblee",
          submitLabel: "Planifier",
          fields: [
            { name: "title", label: "Titre", required: true },
            { name: "description", label: "Description", type: "textarea" },
            {
              name: "type",
              label: "Type",
              type: "select",
              options: [
                { label: "Ordinaire", value: "ORDINAIRE" },
                { label: "Extraordinaire", value: "EXTRAORDINAIRE" },
              ],
            },
            { name: "scheduledAt", label: "Date et heure", type: "datetime-local", required: true },
            { name: "location", label: "Lieu", required: true },
            { name: "meetingLink", label: "Lien reunion" },
            { name: "quorumRequired", label: "Quorum requis", type: "number" },
          ],
        }}
        deleteEndpoint={(residenceId, row) => `/syndic/residences/${residenceId}/assemblies/${row.id}`}
        columns={[
          { key: "title", header: "Titre", render: (row) => String(row.title ?? "-") },
          { key: "type", header: "Type", render: (row) => String(row.type ?? "-") },
          { key: "status", header: "Statut", render: (row) => badgeForStatus(row.status) },
          { key: "scheduledAt", header: "Date", render: (row) => row.scheduledAt ? new Date(String(row.scheduledAt)).toLocaleString("fr-FR") : "-" },
          { key: "location", header: "Lieu", render: (row) => String(row.location ?? "-") },
        ]}
      />
    </DashboardLayout>
  );
}
