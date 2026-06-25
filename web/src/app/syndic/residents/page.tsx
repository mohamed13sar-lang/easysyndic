"use client";

import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { ResidenceResourceManager } from "@/components/resource-pages";

function nested(row: Record<string, unknown>, key: string) {
  const user = row.user;
  return user && typeof user === "object" ? (user as Record<string, unknown>)[key] : undefined;
}

export default function SyndicResidentsPage() {
  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Residents" subtitle="Fiches residents et affectations." />
      <ResidenceResourceManager
        title="les residents"
        endpoint={(id) => `/syndic/residences/${id}/residents`}
        create={{
          title: "Ajouter un resident",
          submitLabel: "Creer",
          fields: [
            { name: "fullName", label: "Nom complet", required: true },
            { name: "phone", label: "Telephone", required: true },
            { name: "email", label: "Email" },
            { name: "password", label: "Mot de passe", type: "text" },
            { name: "apartmentId", label: "Appartement", type: "select", optionSource: "apartments", required: true },
            {
              name: "residentType",
              label: "Type",
              type: "select",
              required: true,
              options: [
                { label: "Proprietaire", value: "OWNER" },
                { label: "Locataire", value: "TENANT" },
              ],
            },
          ],
        }}
        columns={[
          { key: "name", header: "Nom", render: (row) => String(row.fullName ?? nested(row, "fullName") ?? "-") },
          { key: "phone", header: "Telephone", render: (row) => String(row.phone ?? nested(row, "phone") ?? "-") },
          { key: "email", header: "Email", render: (row) => String(row.email ?? nested(row, "email") ?? "-") },
          {
            key: "apartment",
            header: "Appartement",
            render: (row) => {
              const links = Array.isArray(row.residentApartments) ? row.residentApartments : [];
              const first = links[0] as Record<string, unknown> | undefined;
              const apartment = first?.apartment as Record<string, unknown> | undefined;
              return String(apartment?.number ?? "-");
            },
          },
        ]}
      />
    </DashboardLayout>
  );
}
