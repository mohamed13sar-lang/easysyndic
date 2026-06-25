"use client";

import { useEffect, useState } from "react";
import { DashboardLayout, PageHeader } from "@/components/dashboard-layout";
import { apiRequest, ApiError } from "@/lib/api";
import type { Residence } from "@/lib/types";
import { DataTable, EmptyState, ErrorState, LoadingState } from "@/components/ui";

type TeamMember = {
  id: string;
  role: string;
  isActive: boolean;
  user?: { fullName?: string; phone?: string; email?: string | null };
};

export default function SyndicTeamPage() {
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Residence[]>("/syndic/residences")
      .then((residences) => {
        const first = residences[0]?.id;
        if (!first) return [];
        return apiRequest<TeamMember[]>(`/syndic/team?residenceId=${first}`);
      })
      .then((team) => setRows(team ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger l’équipe."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout allowed="syndic">
      <PageHeader title="Équipe" subtitle="Gestion équipe et permissions." />
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : rows.length ? (
        <DataTable rows={rows} columns={[
          { key: "name", header: "Nom", render: (row) => row.user?.fullName ?? "-" },
          { key: "role", header: "Rôle", render: (row) => row.role },
          { key: "phone", header: "Téléphone", render: (row) => row.user?.phone ?? "-" },
          { key: "status", header: "Statut", render: (row) => row.isActive ? "Actif" : "Inactif" },
        ]} />
      ) : <EmptyState title="Aucun membre d’équipe." />}
    </DashboardLayout>
  );
}
