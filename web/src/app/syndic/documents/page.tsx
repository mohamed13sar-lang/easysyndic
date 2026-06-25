"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceScopedList } from "@/components/resource-pages";

export default function SyndicDocumentsPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Documents" subtitle="Liste des documents par résidence. Upload web à finaliser." />
      <ResidenceScopedList title="les documents" endpoint={(id) => `/syndic/residences/${id}/documents`} columns={[
        { key: "title", header: "Titre", render: (row) => String(row.title ?? "-") },
        { key: "type", header: "Type", render: (row) => String(row.type ?? "-") },
        { key: "fileName", header: "Fichier", render: (row) => String(row.fileName ?? "-") },
      ]} />
    </DashboardLayout>
  );
}
