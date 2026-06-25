"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceResourceManager, badgeForStatus } from "@/components/resource-pages";

function nestedName(row: Record<string, unknown>, key: "apartment" | "resident") {
  const value = row[key];
  if (!value || typeof value !== "object") return "-";
  const item = value as Record<string, unknown>;
  return String(item.number ?? item.fullName ?? "-");
}

export default function SyndicPaymentsPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Paiements" subtitle="Charges, impayes et declarations." />
      <ResidenceResourceManager
        title="les paiements"
        endpoint={(id) => `/syndic/residences/${id}/payments`}
        create={{
          title: "Ajouter un paiement",
          submitLabel: "Creer",
          fields: [
            { name: "apartmentId", label: "Appartement", type: "select", optionSource: "apartments", required: true },
            { name: "residentId", label: "Resident", type: "select", optionSource: "residents", required: true },
            { name: "amountDue", label: "Montant du", type: "number", required: true },
            { name: "amountPaid", label: "Montant paye", type: "number" },
            { name: "month", label: "Mois", type: "number", required: true, defaultValue: String(new Date().getMonth() + 1) },
            { name: "year", label: "Annee", type: "number", required: true, defaultValue: String(new Date().getFullYear()) },
            {
              name: "status",
              label: "Statut",
              type: "select",
              options: [
                { label: "Non paye", value: "NON_PAYE" },
                { label: "Paye", value: "PAYE" },
                { label: "Partiel", value: "PARTIELLEMENT_PAYE" },
                { label: "En retard", value: "EN_RETARD" },
                { label: "Exonere", value: "EXONERE" },
              ],
            },
          ],
        }}
        deleteEndpoint={(residenceId, row) => `/syndic/residences/${residenceId}/payments/${row.id}`}
        columns={[
          { key: "period", header: "Periode", render: (row) => `${String(row.month ?? "-")}/${String(row.year ?? "-")}` },
          { key: "apartment", header: "Appartement", render: (row) => nestedName(row, "apartment") },
          { key: "resident", header: "Resident", render: (row) => nestedName(row, "resident") },
          { key: "due", header: "Montant du", render: (row) => `${String(row.amountDue ?? "-")} MAD` },
          { key: "paid", header: "Paye", render: (row) => `${String(row.amountPaid ?? "-")} MAD` },
          { key: "remaining", header: "Reste", render: (row) => `${String(row.remainingAmount ?? "-")} MAD` },
          { key: "status", header: "Statut", render: (row) => badgeForStatus(row.status) },
        ]}
      />
    </DashboardLayout>
  );
}
