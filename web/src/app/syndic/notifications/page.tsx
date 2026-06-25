"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceResourceManager, badgeForStatus } from "@/components/resource-pages";

export default function SyndicNotificationsPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Notifications" subtitle="Envoyer et suivre les messages transmis aux residents." />
      <ResidenceResourceManager
        title="les notifications"
        endpoint={(id) => `/residences/${id}/notifications`}
        create={{
          title: "Envoyer une notification",
          submitLabel: "Envoyer",
          fields: [
            { name: "title", label: "Titre", required: true },
            { name: "message", label: "Message", type: "textarea", required: true },
            {
              name: "type",
              label: "Type",
              type: "select",
              options: [
                { label: "Generale", value: "GENERAL" },
                { label: "Ciblee", value: "TARGETED" },
                { label: "Systeme", value: "SYSTEM" },
              ],
            },
            {
              name: "targetType",
              label: "Cible",
              type: "select",
              required: true,
              options: [
                { label: "Residence", value: "RESIDENCE" },
                { label: "Impayes", value: "NON_PAID" },
              ],
            },
          ],
        }}
        columns={[
          { key: "title", header: "Titre", render: (row) => String(row.title ?? "-") },
          { key: "type", header: "Type", render: (row) => badgeForStatus(row.type) },
          { key: "target", header: "Cible", render: (row) => String(row.targetType ?? "-") },
          { key: "recipients", header: "Destinataires", render: (row) => String(row.recipientsCount ?? "-") },
          { key: "createdAt", header: "Date", render: (row) => row.createdAt ? new Date(String(row.createdAt)).toLocaleString("fr-FR") : "-" },
        ]}
      />
    </DashboardLayout>
  );
}
