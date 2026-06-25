"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { AppButton, AppInput, AppSelect, ErrorState } from "./ui";

export function ResidenceForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [syndics, setSyndics] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", address: "", city: "", district: "", syndicId: "", totalApartments: "" });

  useEffect(() => {
    apiRequest<User[]>("/users")
      .then((users) => {
        const syndicUsers = users.filter((user) => user.role === "SYNDIC");
        setSyndics(syndicUsers);
        setForm((current) => ({ ...current, syndicId: current.syndicId || syndicUsers[0]?.id || "" }));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible de charger les syndics."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await apiRequest("/residences", {
        method: "POST",
        body: {
          name: form.name,
          address: form.address,
          city: form.city,
          district: form.district || undefined,
          syndicId: form.syndicId || undefined,
          totalApartments: form.totalApartments ? Number(form.totalApartments) : undefined,
        },
      });
      router.replace("/super-admin/residences");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Creation impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="max-w-2xl space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6" onSubmit={submit}>
      <Field label="Nom"><AppInput className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
      <Field label="Adresse"><AppInput className="w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></Field>
      <Field label="Ville"><AppInput className="w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></Field>
      <Field label="Quartier"><AppInput className="w-full" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
      <Field label="Syndic">
        <AppSelect className="w-full" value={form.syndicId} onChange={(e) => setForm({ ...form, syndicId: e.target.value })} required>
          {syndics.map((syndic) => <option key={syndic.id} value={syndic.id}>{syndic.fullName}</option>)}
        </AppSelect>
      </Field>
      <Field label="Total appartements"><AppInput className="w-full" type="number" value={form.totalApartments} onChange={(e) => setForm({ ...form, totalApartments: e.target.value })} /></Field>
      {error && <ErrorState message={error} />}
      <AppButton disabled={isSaving || !form.syndicId}>{isSaving ? "Enregistrement..." : "Creer la residence"}</AppButton>
    </form>
  );
}

export function SyndicForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", role: "SYNDIC" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await apiRequest("/users", { method: "POST", body: form });
      router.replace("/super-admin/syndics");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Creation impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="max-w-2xl space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-6" onSubmit={submit}>
      <Field label="Nom complet"><AppInput className="w-full" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
      <Field label="Email"><AppInput className="w-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
      <Field label="Telephone"><AppInput className="w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
      <Field label="Mot de passe"><AppInput className="w-full" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
      <Field label="Role"><AppSelect className="w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="SYNDIC">SYNDIC</option></AppSelect></Field>
      {error && <ErrorState message={error} />}
      <AppButton disabled={isSaving}>{isSaving ? "Enregistrement..." : "Creer le syndic"}</AppButton>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span>{children}</label>;
}
