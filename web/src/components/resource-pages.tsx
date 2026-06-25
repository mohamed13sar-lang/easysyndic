"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import type { DashboardStats, Residence, User, Assembly, Announcement } from "@/lib/types";
import { AppButton, AppInput, AppSelect, Badge, DataTable, EmptyState, ErrorState, LoadingState, StatCard } from "./ui";

export function StatsDashboard({
  title,
  subtitle,
  variant,
}: {
  title: string;
  subtitle: string;
  variant: "super-admin" | "syndic";
}) {
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

  const cards: Array<[string, string | number]> =
    variant === "super-admin"
      ? [
          ["Total résidences", stats.totalResidences ?? "-"],
          ["Total syndics", totalSyndics],
          ["Total résidents", stats.totalResidents ?? "-"],
          ["Réclamations ouvertes", stats.openComplaints ?? "-"],
          ["Paiements en attente", stats.pendingPayments ?? "-"],
        ]
      : [
          ["Résidences", stats.totalResidences ?? "-"],
          ["Appartements", stats.totalApartments ?? "-"],
          ["Résidents", stats.totalResidents ?? "-"],
          ["Impayés", `${stats.unpaidAmount ?? 0} MAD`],
          ["Paiements en attente", stats.pendingPayments ?? "-"],
          ["Réclamations ouvertes", stats.openComplaints ?? "-"],
        ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-[#6B7280]">{subtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => <StatCard key={label} title={label} value={value} />)}
      </div>
    </div>
  );
}

export function ResidencesList({ scope }: { scope: "super-admin" | "syndic" }) {
  const [rows, setRows] = useState<Residence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest<Residence[]>(scope === "syndic" ? "/syndic/residences" : "/residences")
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les résidences."))
      .finally(() => setLoading(false));
  }, [scope]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!rows.length) return <EmptyState title="Aucune résidence trouvée." actionHref={scope === "super-admin" ? "/super-admin/residences/new" : undefined} actionLabel="Créer une résidence" />;
  return (
    <DataTable
      rows={rows}
      columns={[
        { key: "name", header: "Nom", render: (row) => row.name },
        { key: "city", header: "Ville", render: (row) => row.city },
        { key: "apartments", header: "Appartements", render: (row) => row.totalApartments ?? row.apartmentsCount ?? "-" },
        { key: "status", header: "Statut", render: (row) => <Badge tone={row.isActive === false ? "danger" : "success"}>{row.isActive === false ? "Inactive" : "Active"}</Badge> },
      ]}
    />
  );
}

export function UsersList({ role }: { role?: string }) {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest<User[]>("/users")
      .then((data) => setRows(role ? data.filter((item) => item.role === role) : data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les utilisateurs."))
      .finally(() => setLoading(false));
  }, [role]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!rows.length) return <EmptyState title="Aucun utilisateur trouvé." />;
  return (
    <DataTable
      rows={rows}
      columns={[
        { key: "name", header: "Nom", render: (row) => row.fullName },
        { key: "email", header: "Email", render: (row) => row.email ?? "-" },
        { key: "phone", header: "Téléphone", render: (row) => row.phone },
        { key: "role", header: "Rôle", render: (row) => <Badge>{row.role}</Badge> },
        { key: "status", header: "Statut", render: (row) => <Badge tone={row.isActive ? "success" : "danger"}>{row.isActive ? "Actif" : "Inactif"}</Badge> },
      ]}
    />
  );
}

export function ResidenceScopedList({
  title,
  endpoint,
  columns,
}: {
  title: string;
  endpoint: (residenceId: string) => string;
  columns: Array<{ key: string; header: string; render: (row: Record<string, unknown>) => ReactNode }>;
}) {
  const [residences, setResidences] = useState<Residence[]>([]);
  const [residenceId, setResidenceId] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Residence[]>("/syndic/residences")
      .then((data) => {
        setResidences(data);
        setResidenceId(data[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les résidences."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!residenceId) return;
    apiRequest<Record<string, unknown>[]>(endpoint(residenceId))
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : `Impossible de charger ${title}.`))
      .finally(() => setLoading(false));
  }, [endpoint, residenceId, title]);

  if (error) return <ErrorState message={error} />;
  return (
    <div className="space-y-4">
      <select className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold" value={residenceId} onChange={(event) => setResidenceId(event.target.value)}>
        {residences.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {loading ? <LoadingState /> : rows.length ? <DataTable rows={rows} columns={columns} /> : <EmptyState title={`Aucune donnée pour ${title}.`} />}
    </div>
  );
}

type GenericRow = Record<string, unknown> & { id?: string; isActive?: boolean };
type OptionSource = "apartments" | "residents";

type FormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "textarea" | "select";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  optionSource?: OptionSource;
  valueAsNumber?: boolean;
  defaultValue?: string;
};

type RelatedOptions = Record<OptionSource, GenericRow[]>;

function cleanBody(fields: FormField[], values: Record<string, string>) {
  return fields.reduce<Record<string, unknown>>((body, field) => {
    const raw = values[field.name];
    if (raw === undefined || raw === "") return body;
    if (field.valueAsNumber || field.type === "number") {
      body[field.name] = Number(raw);
      return body;
    }
    if (field.type === "datetime-local") {
      body[field.name] = new Date(raw).toISOString();
      return body;
    }
    body[field.name] = raw;
    return body;
  }, {});
}

function fieldInitialValues(fields: FormField[]) {
  return fields.reduce<Record<string, string>>((values, field) => {
    values[field.name] = field.defaultValue ?? field.options?.[0]?.value ?? "";
    return values;
  }, {});
}

function labelForOption(row: GenericRow, source: OptionSource) {
  if (source === "apartments") {
    return String(row.number ?? row.name ?? row.id ?? "-");
  }
  return String(row.fullName ?? row.user?.["fullName" as never] ?? row.id ?? "-");
}

function idOf(row: GenericRow) {
  return String(row.id ?? "");
}

function badgeForStatus(value: unknown) {
  const text = String(value ?? "-");
  const tone = ["PAYE", "PUBLISHED", "CLOSED", "Actif"].includes(text)
    ? "success"
    : ["NON_PAYE", "EN_RETARD", "OPEN", "URGENT"].includes(text)
      ? "danger"
      : "neutral";
  return <Badge tone={tone}>{text}</Badge>;
}

export function ResidenceResourceManager({
  title,
  endpoint,
  columns,
  create,
  deleteEndpoint,
  statusEndpoint,
}: {
  title: string;
  endpoint: (residenceId: string) => string;
  columns: Array<{ key: string; header: string; render: (row: GenericRow) => ReactNode }>;
  create?: {
    title: string;
    submitLabel: string;
    fields: FormField[];
    endpoint?: (residenceId: string) => string;
  };
  deleteEndpoint?: (residenceId: string, row: GenericRow) => string;
  statusEndpoint?: (residenceId: string, row: GenericRow) => string;
}) {
  const [residences, setResidences] = useState<Residence[]>([]);
  const [residenceId, setResidenceId] = useState("");
  const [rows, setRows] = useState<GenericRow[]>([]);
  const [related, setRelated] = useState<RelatedOptions>({ apartments: [], residents: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>(() => fieldInitialValues(create?.fields ?? []));

  const neededSources = useMemo(() => {
    return Array.from(new Set(create?.fields.map((field) => field.optionSource).filter(Boolean))) as OptionSource[];
  }, [create?.fields]);

  const loadRows = async (targetResidenceId = residenceId) => {
    if (!targetResidenceId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<GenericRow[]>(endpoint(targetResidenceId));
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Impossible de charger ${title}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiRequest<Residence[]>("/syndic/residences")
      .then((data) => {
        setResidences(data);
        const first = data[0]?.id ?? "";
        setResidenceId(first);
        return loadRows(first);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Impossible de charger les residences.");
        setLoading(false);
      });
    // loadRows is intentionally called only after the first residence is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!residenceId || neededSources.length === 0) return;
    Promise.all(
      neededSources.map(async (source) => {
        const path =
          source === "apartments"
            ? `/syndic/residences/${residenceId}/apartments`
            : `/syndic/residences/${residenceId}/residents`;
        const data = await apiRequest<GenericRow[]>(path);
        return [source, data] as const;
      }),
    )
      .then((entries) => {
        setRelated((current) => entries.reduce((next, [source, data]) => ({ ...next, [source]: data }), current));
        setForm((current) => {
          if (!create) return current;
          return create.fields.reduce((next, field) => {
            if (!field.optionSource || next[field.name]) return next;
            const first = entries.find(([source]) => source === field.optionSource)?.[1][0];
            return first ? { ...next, [field.name]: idOf(first) } : next;
          }, current);
        });
      })
      .catch(() => undefined);
  }, [create, neededSources, residenceId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!create || !residenceId) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(create.endpoint?.(residenceId) ?? endpoint(residenceId), {
        method: "POST",
        body: cleanBody(create.fields, form),
      });
      setForm(fieldInitialValues(create.fields));
      await loadRows();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: "delete" | "status", row: GenericRow) {
    if (!residenceId) return;
    const path = action === "delete" ? deleteEndpoint?.(residenceId, row) : statusEndpoint?.(residenceId, row);
    if (!path) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(path, {
        method: action === "delete" ? "DELETE" : "PATCH",
        body: action === "status" ? { isActive: row.isActive === false } : undefined,
      });
      await loadRows();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setSaving(false);
    }
  }

  const tableColumns = [
    ...columns,
    ...(deleteEndpoint || statusEndpoint
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (row: GenericRow) => (
              <div className="flex flex-wrap gap-2">
                {statusEndpoint && (
                  <AppButton type="button" variant="secondary" disabled={saving} onClick={() => runAction("status", row)}>
                    {row.isActive === false ? "Activer" : "Desactiver"}
                  </AppButton>
                )}
                {deleteEndpoint && (
                  <AppButton type="button" variant="danger" disabled={saving} onClick={() => runAction("delete", row)}>
                    Supprimer
                  </AppButton>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[#DDE5E3] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <AppSelect value={residenceId} onChange={(event) => { setResidenceId(event.target.value); void loadRows(event.target.value); }}>
          {residences.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </AppSelect>
        <AppButton type="button" variant="secondary" onClick={() => loadRows()} disabled={loading}>Rafraichir</AppButton>
      </div>

      {create && (
        <form className="grid gap-3 rounded-lg border border-[#DDE5E3] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
          <div className="md:col-span-2 xl:col-span-4">
            <h2 className="font-black text-[#1F2328]">{create.title}</h2>
            <p className="mt-1 text-sm font-semibold text-[#6B7280]">Les donnees sont enregistrees directement dans le backend.</p>
          </div>
          {create.fields.map((field) => (
            <label key={field.name} className={field.type === "textarea" ? "md:col-span-2 xl:col-span-4" : "block"}>
              <span className="mb-1 block text-xs font-black text-[#6B7280]">{field.label}</span>
              {field.type === "select" ? (
                <AppSelect className="w-full" value={form[field.name] ?? ""} required={field.required} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}>
                  {field.optionSource
                    ? related[field.optionSource].map((row) => <option key={idOf(row)} value={idOf(row)}>{labelForOption(row, field.optionSource!)}</option>)
                    : field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </AppSelect>
              ) : field.type === "textarea" ? (
                <textarea
                  className="min-h-24 w-full rounded-lg border border-[#DDE5E3] bg-white px-3 py-2 text-sm font-semibold text-[#1F2328] outline-none transition focus:border-[#0FA19A] focus:ring-2 focus:ring-[#D6F3F1]"
                  value={form[field.name] ?? ""}
                  required={field.required}
                  onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                />
              ) : (
                <AppInput className="w-full" type={field.type ?? "text"} value={form[field.name] ?? ""} required={field.required} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} />
              )}
            </label>
          ))}
          <div className="md:col-span-2 xl:col-span-4">
            <AppButton disabled={saving || !residenceId}>{saving ? "Enregistrement..." : create.submitLabel}</AppButton>
          </div>
        </form>
      )}

      {error && <ErrorState message={error} />}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#1F2328]">Liste</h2>
          <p className="text-sm font-bold text-[#6B7280]">{rows.length} element(s)</p>
        </div>
        {loading ? <LoadingState /> : rows.length ? <DataTable rows={rows} columns={tableColumns} /> : <EmptyState title={`Aucune donnee pour ${title}.`} />}
      </div>
    </div>
  );
}

export function LatestBlocks() {
  const [residences, setResidences] = useState<Residence[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    apiRequest<Residence[]>("/syndic/residences").then((data) => {
      setResidences(data);
      const first = data[0]?.id;
      if (!first) return;
      apiRequest<Assembly[]>(`/syndic/residences/${first}/assemblies`).then(setAssemblies).catch(() => setAssemblies([]));
      apiRequest<Announcement[]>(`/syndic/residences/${first}/announcements`).then(setAnnouncements).catch(() => setAnnouncements([]));
    }).catch(() => setResidences([]));
  }, []);

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="font-black">Dernières annonces</h2>
        <div className="mt-4 space-y-3">{announcements.slice(0, 4).map((item) => <p key={item.id} className="text-sm font-bold text-[#6B7280]">{item.title}</p>) || null}</div>
      </div>
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h2 className="font-black">Dernières assemblées</h2>
        <div className="mt-4 space-y-3">{assemblies.slice(0, 4).map((item) => <p key={item.id} className="text-sm font-bold text-[#6B7280]">{item.title}</p>) || null}</div>
        {!residences.length && <p className="mt-4 text-sm font-semibold text-[#6B7280]">Sélection de résidence requise.</p>}
      </div>
    </div>
  );
}

export function PageAction({ href, label }: { href: string; label: string }) {
  return <Link href={href}><AppButton>{label}</AppButton></Link>;
}

export { badgeForStatus };
