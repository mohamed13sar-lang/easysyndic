"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearSession, getHomeForRole, getStoredUser, syndicRoles, type AuthUser } from "@/lib/auth";

const superAdminNav = [
  ["Dashboard", "/super-admin/dashboard", "Vue globale"],
  ["Residences", "/super-admin/residences", "Portefeuille"],
  ["Syndics", "/super-admin/syndics", "Comptes"],
  ["Utilisateurs", "/super-admin/users", "Roles"],
];

const syndicNav = [
  ["Dashboard", "/syndic/dashboard", "Pilotage"],
  ["Residences", "/syndic/residences", "Sites"],
  ["Appartements", "/syndic/apartments", "Lots"],
  ["Residents", "/syndic/residents", "Contacts"],
  ["Paiements", "/syndic/payments", "Charges"],
  ["Reclamations", "/syndic/complaints", "Suivi"],
  ["Notifications", "/syndic/notifications", "Messages"],
  ["Documents", "/syndic/documents", "Fichiers"],
  ["Annonces", "/syndic/announcements", "Info"],
  ["Assemblees", "/syndic/assemblies", "AG"],
  ["Equipe", "/syndic/team", "Permissions"],
];

export function DashboardLayout({ children, allowed }: { children: React.ReactNode; allowed: "super-admin" | "syndic" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
    setMounted(true);
    if (!storedUser) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (mounted && !user) router.replace("/login");
  }, [mounted, router, user]);

  const accessDenied = useMemo(() => {
    if (!user) return false;
    if (allowed === "super-admin") return user.role !== "SUPER_ADMIN";
    return !syndicRoles.includes(user.role);
  }, [allowed, user]);

  const nav = allowed === "super-admin" ? superAdminNav : syndicNav;

  if (!mounted || !user) {
    return <div className="min-h-screen bg-[#F8FAFB] p-8 text-sm font-bold text-[#6B7280]">Chargement...</div>;
  }

  if (accessDenied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFB] p-6">
        <div className="max-w-md rounded-lg border border-[#DDE5E3] bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-black text-[#1F2328]">Acces refuse</h1>
          <p className="mt-2 text-sm font-semibold text-[#6B7280]">Votre role ne permet pas d'acceder a cette section.</p>
          <button className="mt-5 rounded-lg bg-[#0FA19A] px-4 py-2 text-sm font-extrabold text-white" onClick={() => router.replace(getHomeForRole(user.role))}>Retour</button>
        </div>
      </div>
    );
  }

  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-[#F8FAFB] text-[#1F2328]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#DDE5E3] bg-white lg:block">
        <div className="border-b border-[#EEF2F1] p-5">
          <div className="text-2xl font-black"><span>Easy</span><span className="text-[#0FA19A]">Syndic</span></div>
          <p className="mt-2 text-xs font-bold uppercase text-[#6B7280]">{allowed === "super-admin" ? "Console plateforme" : "Console syndic"}</p>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map(([label, href, hint]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={`group block rounded-lg px-3 py-3 transition ${active ? "bg-[#E7F7F6] text-[#0B8F89]" : "text-[#5F6B67] hover:bg-[#F6F8F7] hover:text-[#1F2328]"}`}>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-extrabold">{label}</span>
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-[#0FA19A]" : "bg-transparent group-hover:bg-[#CBD5D3]"}`} />
                </span>
                <span className="mt-0.5 block text-xs font-bold opacity-70">{hint}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#DDE5E3] bg-white/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-[#0FA19A]">{user.role}</p>
              <p className="truncate text-sm font-extrabold text-[#1F2328]">{user.fullName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-[#6B7280]">{user.email ?? user.phone}</p>
                <p className="text-xs font-bold text-[#0FA19A]">Session active</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E7F7F6] text-sm font-black text-[#0B8F89]">{initials || "ES"}</div>
              <button className="rounded-lg border border-[#DDE5E3] px-4 py-2 text-sm font-extrabold transition hover:bg-[#F6F8F7]" onClick={() => { clearSession(); router.replace("/login"); }}>Deconnexion</button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-[#DDE5E3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] md:flex-row md:items-center">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-black uppercase text-[#0FA19A]">EasySyndic</p>
        <h1 className="text-2xl font-black tracking-normal text-[#1F2328] md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#6B7280]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
