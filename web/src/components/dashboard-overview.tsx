"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import type { Announcement, Assembly, DashboardStats, Residence, User } from "@/lib/types";
import { ErrorState, LoadingState, StatCard } from "./ui";

type Variant = "super-admin" | "syndic";

export function DashboardOverview({ variant }: { variant: Variant }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [totalSyndics, setTotalSyndics] = useState<string | number>("-");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<DashboardStats>(variant === "syndic" ? "/syndic/dashboard/stats" : "/dashboard/stats")
      .then(async (data) => {
        setStats(data);
        if (variant === "super-admin") {
          const users = await apiRequest<User[]>("/users");
          setTotalSyndics(users.filter((user) => user.role === "SYNDIC").length);
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les statistiques."));
  }, [variant]);

  if (error) return <ErrorState message={error} />;
  if (!stats) return <LoadingState />;

  const cards =
    variant === "super-admin"
      ? [
          ["Residences", stats.totalResidences ?? "-", "Portefeuille actif", "/super-admin/residences"],
          ["Syndics", totalSyndics, "Comptes gestionnaires", "/super-admin/syndics"],
          ["Residents", stats.totalResidents ?? "-", "Utilisateurs residents", "/super-admin/users"],
          ["Reclamations ouvertes", stats.openComplaints ?? "-", "Demandes a suivre", "/super-admin/dashboard"],
          ["Paiements en attente", stats.pendingPayments ?? "-", "Validation financiere", "/super-admin/dashboard"],
        ]
      : [
          ["Residences", stats.totalResidences ?? "-", "Portefeuille gere", "/syndic/residences"],
          ["Appartements", stats.totalApartments ?? "-", "Lots suivis", "/syndic/apartments"],
          ["Residents", stats.totalResidents ?? "-", "Contacts actifs", "/syndic/residents"],
          ["Impayes", `${stats.unpaidAmount ?? 0} MAD`, "Montant restant", "/syndic/payments"],
          ["Paiements en attente", stats.pendingPayments ?? "-", "Declarations", "/syndic/payments"],
          ["Reclamations ouvertes", stats.openComplaints ?? "-", "Demandes actives", "/syndic/complaints"],
        ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1F2328]">Indicateurs cles</h2>
          <p className="mt-1 text-sm font-semibold text-[#6B7280]">Donnees live depuis le backend EasySyndic.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([title, value, helper, href]) => (
          <StatCard key={String(title)} title={String(title)} value={value} helper={String(helper)} href={String(href)} />
        ))}
      </div>
    </section>
  );
}

export function QuickActions({ variant }: { variant: Variant }) {
  const actions =
    variant === "super-admin"
      ? [
          ["Creer une residence", "Affecter un syndic et ouvrir le portefeuille", "/super-admin/residences/new"],
          ["Creer un syndic", "Ajouter un compte gestionnaire", "/super-admin/syndics/new"],
          ["Voir les utilisateurs", "Controler roles et statuts", "/super-admin/users"],
        ]
      : [
          ["Gerer les appartements", "Lots, blocs et cotisations", "/syndic/apartments"],
          ["Gerer les residents", "Fiches residents et affectations", "/syndic/residents"],
          ["Gerer les paiements", "Charges, impayes et declarations", "/syndic/payments"],
          ["Suivre les reclamations", "Demandes ouvertes et resolues", "/syndic/complaints"],
          ["Envoyer une notification", "Informer les residents en temps reel", "/syndic/notifications"],
          ["Publier une annonce", "Travaux, securite, AG et alertes", "/syndic/announcements"],
          ["Planifier une assemblee", "AG, quorum, presence et votes", "/syndic/assemblies"],
        ];

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-[#1F2328]">Actions rapides</h2>
        <p className="text-sm font-bold text-[#6B7280]">Gestion courante</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map(([title, subtitle, href]) => (
          <Link key={href} href={href} className="group rounded-lg border border-[#DDE5E3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#B7D9D3]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E7F7F6] text-sm font-black text-[#0B8F89]">{title.slice(0, 2).toUpperCase()}</div>
              <span className="text-lg font-black text-[#9CA3AF] group-hover:text-[#0FA19A]">›</span>
            </div>
            <p className="mt-4 font-black text-[#1F2328]">{title}</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-[#6B7280]">{subtitle}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SyndicRecentActivity() {
  const [residences, setResidences] = useState<Residence[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    apiRequest<Residence[]>("/syndic/residences")
      .then((data) => {
        setResidences(data);
        const first = data[0]?.id;
        if (!first) return;
        apiRequest<Assembly[]>(`/syndic/residences/${first}/assemblies`).then(setAssemblies).catch(() => setAssemblies([]));
        apiRequest<Announcement[]>(`/syndic/residences/${first}/announcements`).then(setAnnouncements).catch(() => setAnnouncements([]));
      })
      .catch(() => setResidences([]));
  }, []);

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-2">
      <ActivityPanel title="Dernieres annonces" href="/syndic/announcements">
        {announcements.slice(0, 4).map((item) => (
          <div key={item.id} className="rounded-lg border border-[#EEF2F1] bg-[#FAFCFC] p-3">
            <p className="text-sm font-black text-[#1F2328]">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#6B7280]">{item.message}</p>
          </div>
        ))}
        {!announcements.length && <p className="text-sm font-semibold text-[#6B7280]">Aucune annonce recente.</p>}
      </ActivityPanel>
      <ActivityPanel title="Dernieres assemblees" href="/syndic/assemblies">
        {assemblies.slice(0, 4).map((item) => (
          <div key={item.id} className="rounded-lg border border-[#EEF2F1] bg-[#FAFCFC] p-3">
            <p className="text-sm font-black text-[#1F2328]">{item.title}</p>
            <p className="mt-1 text-xs font-semibold text-[#6B7280]">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("fr-FR") : item.status}</p>
          </div>
        ))}
        {!assemblies.length && <p className="text-sm font-semibold text-[#6B7280]">{residences.length ? "Aucune assemblee recente." : "Selection de residence requise."}</p>}
      </ActivityPanel>
    </section>
  );
}

function ActivityPanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#DDE5E3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-black text-[#1F2328]">{title}</h2>
        <Link href={href} className="text-sm font-black text-[#0FA19A]">Voir</Link>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
