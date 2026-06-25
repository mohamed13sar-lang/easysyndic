"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceResourceManager, badgeForStatus } from "@/components/resource-pages";

export default function SyndicAnnouncementsPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Annonces" subtitle="Creation et publication des annonces." />
      <ResidenceResourceManager
        title="les annonces"
        endpoint={(id) => `/syndic/residences/${id}/announcements`}
        create={{
          title: "Publier une annonce",
          submitLabel: "Publier",
          fields: [
            { name: "title", label: "Titre", required: true },
            { name: "message", label: "Message", type: "textarea", required: true },
            {
              name: "type",
              label: "Type",
              type: "select",
              options: [
                { label: "Assemblee generale", value: "ASSEMBLEE_GENERALE" },
                { label: "Travaux", value: "TRAVAUX" },
                { label: "Nettoyage", value: "NETTOYAGE" },
                { label: "Securite", value: "SECURITE" },
                { label: "Eau", value: "COUPURE_EAU" },
                { label: "Electricite", value: "COUPURE_ELECTRICITE" },
                { label: "Autre", value: "AUTRE" },
              ],
            },
            {
              name: "priority",
              label: "Priorite",
              type: "select",
              options: [
                { label: "Normal", value: "NORMAL" },
                { label: "Important", value: "IMPORTANT" },
                { label: "Urgent", value: "URGENT" },
              ],
            },
            { name: "publishAt", label: "Publication", type: "datetime-local" },
          ],
        }}
        deleteEndpoint={(residenceId, row) => `/syndic/residences/${residenceId}/announcements/${row.id}`}
        columns={[
          { key: "title", header: "Titre", render: (row) => String(row.title ?? "-") },
          { key: "type", header: "Type", render: (row) => String(row.type ?? "-") },
          { key: "priority", header: "Priorite", render: (row) => badgeForStatus(row.priority) },
          { key: "publishAt", header: "Publication", render: (row) => row.publishAt ? new Date(String(row.publishAt)).toLocaleDateString("fr-FR") : "-" },
        ]}
      />
    </DashboardLayout>
  );
}
