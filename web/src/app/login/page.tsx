"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthSession, getHomeForRole, saveSession } from "@/lib/auth";
import { AppButton, AppInput, ErrorState } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const session = await apiRequest<AuthSession>("/auth/login", {
        method: "POST",
        body: { identifier, password },
      });
      saveSession(session);
      if (session.user.role === "RESIDENT") {
        setError("L’accès résident est disponible sur l’application mobile EasySyndic.");
        return;
      }
      router.replace(getHomeForRole(session.user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8F7] p-6">
      <section className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="text-3xl font-black"><span>Easy</span><span className="text-[#0FA19A]">Syndic</span></div>
          <h1 className="mt-6 text-2xl font-black text-[#111827]">Connexion dashboard</h1>
          <p className="mt-2 text-sm font-semibold text-[#6B7280]">Accès SUPER_ADMIN, SYNDIC et équipe syndic.</p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-sm font-black">Email ou téléphone</label>
            <AppInput className="w-full" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-black">Mot de passe</label>
            <AppInput className="w-full" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error && <ErrorState message={error} />}
          <AppButton className="w-full" disabled={isLoading}>{isLoading ? "Connexion..." : "Se connecter"}</AppButton>
        </form>
      </section>
    </main>
  );
}
