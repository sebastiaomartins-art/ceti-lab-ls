import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { unlockSite } from "@/lib/agenda.functions";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Agenda do Laboratório | CETI Landri Sales" },
      {
        name: "description",
        content:
          "Área restrita da agenda do Laboratório de Informática do CETI Landri Sales. Informe a senha da escola para acessar.",
      },
      { property: "og:title", content: "Entrar — Agenda do Laboratório" },
      {
        property: "og:description",
        content: "Acesso restrito à agenda do Laboratório de Informática do CETI Landri Sales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { ok } = await unlock({ data: { password } });
      if (!ok) {
        setError("Senha incorreta.");
        return;
      }
      await router.navigate({ to: "/" });
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-primary-soft px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-card">
            CL
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight">
              Laboratório de Informática
            </h1>
            <p className="text-sm text-muted-foreground">CETI Landri Sales</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Acesso restrito à escola. Informe a senha para ver e usar a agenda.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Senha da escola</span>
            <input
              type="password"
              value={password}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Desenvolvido por: Sebastião Martins 3ºA TDS
        </p>
      </div>
    </div>
  );
}
