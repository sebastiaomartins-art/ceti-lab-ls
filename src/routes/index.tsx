import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  DAYS,
  SLOTS,
  currentWeekKey,
  weekRangeLabel,
  type WeekData,
} from "@/lib/agenda";
import {
  createBooking,
  deleteBooking,
  getAgenda,
  lockSite,
} from "@/lib/agenda.functions";

export const Route = createFileRoute("/")({
  loader: () => getAgenda({ data: {} }),
  head: () => ({
    meta: [
      { title: "Agenda do Laboratório de Informática — CETI Landri Sales" },
      {
        name: "description",
        content:
          "Sistema de agendamento semanal do Laboratório de Informática do CETI Landri Sales: reserve horários por turma e professor, imprima a agenda e veja relatórios.",
      },
      { property: "og:title", content: "Agenda do Laboratório — CETI Landri Sales" },
      {
        property: "og:description",
        content: "Agendamento semanal do Laboratório de Informática com impressão e relatórios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const emptyForm = { professor: "", turma: "", disciplina: "" };

function Index() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const fetchAgenda = useServerFn(getAgenda);
  const addBooking = useServerFn(createBooking);
  const removeBooking = useServerFn(deleteBooking);
  const lock = useServerFn(lockSite);

  const [weekKey, setWeekKey] = useState(initial.weekKey);
  const [data, setData] = useState<WeekData>(initial.week);
  const [weeks, setWeeks] = useState<string[]>(initial.weeks);
  const [tab, setTab] = useState<"agenda" | "relatorio">("agenda");
  const [selected, setSelected] = useState<{ day: string; slot: string } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<{ day: string; slot: string } | null>(null);
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh(wk = weekKey) {
    const res = await fetchAgenda({ data: { weekKey: wk } });
    setWeekKey(res.weekKey);
    setData(res.week);
    setWeeks(res.weeks);
  }


  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const isCurrentWeek = weekKey === currentWeekKey();

  function openWeek(wk: string) {
    setSelected(null);
    void refresh(wk);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    if (!form.professor.trim() || !form.turma.trim()) return;
    setBusy(true);
    try {
      await addBooking({
        data: {
          weekKey,
          dayId: selected.day,
          slotId: selected.slot,
          turma: form.turma.trim(),
          professor: form.professor.trim(),
          disciplina: form.disciplina.trim(),
        },
      });
      await refresh();
      setForm(emptyForm);
      setSelected(null);
      setToast("Agendamento salvo com sucesso.");
    } catch {
      setToast("Não foi possível salvar. Este horário pode já estar ocupado.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingDelete || busy) return;
    setBusy(true);
    try {
      const { ok } = await removeBooking({
        data: {
          weekKey,
          dayId: pendingDelete.day,
          slotId: pendingDelete.slot,
          password: pass,
        },
      });
      if (!ok) {
        setPassError("Senha incorreta.");
        return;
      }
      await refresh();
      setPendingDelete(null);
      setPass("");
      setPassError("");
      setToast("Professor removido do agendamento.");
    } catch {
      setPassError("Não foi possível excluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function sair() {
    await lock({});
    await router.navigate({ to: "/entrar" });
  }


  const stats = useMemo(() => {
    const entries = Object.entries(data);
    const aulas = SLOTS.filter((s) => s.type === "aula").length * DAYS.length;
    const porProfessor = new Map<string, number>();
    const porTurma = new Map<string, number>();
    const porDia = new Map<string, number>();
    for (const [k, b] of entries) {
      porProfessor.set(b.professor, (porProfessor.get(b.professor) ?? 0) + 1);
      porTurma.set(b.turma, (porTurma.get(b.turma) ?? 0) + 1);
      const day = k.split("|")[0]!;
      porDia.set(day, (porDia.get(day) ?? 0) + 1);
    }
    const sort = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    return {
      total: entries.length,
      capacidade: aulas,
      ocupacao: aulas ? Math.round((entries.length / aulas) * 100) : 0,
      porProfessor: sort(porProfessor),
      porTurma: sort(porTurma),
      porDia,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary font-display text-lg font-bold tracking-tight text-primary-foreground shadow-card">
              CL
            </div>
            <div>
              <h1 className="font-display text-xl font-bold leading-tight">
                Laboratório de Informática
              </h1>
              <p className="text-sm text-muted-foreground">
                CETI Landri Sales — Agenda semanal{" "}
                <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                  v3.0
                </span>
              </p>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border bg-secondary p-1">
              {(["agenda", "relatorio"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                    tab === t
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "agenda" ? "Agenda" : "Relatórios"}
                </button>
              ))}
            </div>
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary-strong"
            >
              Imprimir agenda
            </button>
            <button
              onClick={() => void sair()}
              className="rounded-xl border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Sair
            </button>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary-soft px-5 py-4">
          <div>
            <p className="font-display text-base font-bold text-primary">
              Semana de {weekRangeLabel(weekKey)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isCurrentWeek
                ? "A agenda é reiniciada automaticamente toda segunda-feira. As semanas anteriores ficam salvas no histórico."
                : "Você está visualizando uma semana do histórico (somente consulta e impressão)."}
            </p>
          </div>
          <div className="no-print flex items-center gap-2">
            <select
              value={weekKey}
              onChange={(e) => openWeek(e.target.value)}
              className="rounded-xl border bg-card px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              aria-label="Selecionar semana"
            >
              {(weeks.includes(currentWeekKey()) ? weeks : [currentWeekKey(), ...weeks]).map(
                (w) => (
                  <option key={w} value={w}>
                    {weekRangeLabel(w)}
                    {w === currentWeekKey() ? " (atual)" : ""}
                  </option>
                ),
              )}
            </select>
            {!isCurrentWeek && (
              <button
                onClick={() => openWeek(currentWeekKey())}
                className="rounded-xl border bg-card px-3 py-2 text-sm font-medium"
              >
                Voltar para a semana atual
              </button>
            )}
          </div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Agendamentos" value={String(stats.total)} hint="nesta semana" />
          <StatCard
            label="Horários livres"
            value={String(Math.max(stats.capacidade - stats.total, 0))}
            hint={`de ${stats.capacidade} disponíveis`}
          />
          <StatCard
            label="Ocupação"
            value={`${stats.ocupacao}%`}
            hint="do laboratório"
            progress={stats.ocupacao}
          />
          <StatCard
            label="Professores"
            value={String(stats.porProfessor.length)}
            hint={stats.porProfessor[0] ? `mais ativo: ${stats.porProfessor[0][0]}` : "nenhum ainda"}
          />
        </section>

        {tab === "agenda" ? (
          <div className="print-full overflow-x-auto rounded-2xl border bg-card shadow-card">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-36 border-b border-r bg-secondary p-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Horário
                  </th>
                  {DAYS.map((d) => (
                    <th
                      key={d.id}
                      className="border-b border-r bg-secondary p-3 text-center font-display text-xs font-bold uppercase tracking-wider text-primary last:border-r-0"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((s) => {
                  const isBreak = s.type !== "aula";
                  return (
                    <tr key={s.id}>
                      <td className="border-b border-r bg-secondary/50 p-3 text-xs font-bold text-foreground">
                        {s.label}
                      </td>
                      {isBreak ? (
                        <td
                          colSpan={DAYS.length}
                          className="border-b bg-muted p-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground"
                        >
                          {s.type === "almoco" ? "Almoço" : "Intervalo"}
                        </td>
                      ) : (
                        DAYS.map((d) => {
                          const key = `${d.id}|${s.id}`;
                          const b = data[key];
                          return (
                            <td
                              key={d.id}
                              className="border-b border-r p-2 align-top last:border-r-0"
                            >
                              {b ? (
                                <div className="group rounded-xl border border-primary/20 bg-primary-soft p-2.5">
                                  <p className="font-display text-sm font-bold text-primary">
                                    {b.turma}
                                  </p>
                                  <p className="mt-0.5 text-[13px] font-semibold text-foreground">
                                    {b.professor}
                                  </p>
                                  {b.disciplina && (
                                    <p className="text-xs text-muted-foreground">{b.disciplina}</p>
                                  )}
                                  {isCurrentWeek && (
                                    <button
                                      onClick={() => {
                                        setPendingDelete({ day: d.id, slot: s.id });
                                        setPass("");
                                        setPassError("");
                                      }}
                                      className="no-print mt-1.5 text-[11px] font-semibold text-destructive opacity-0 transition-opacity hover:underline focus:opacity-100 group-hover:opacity-100"
                                    >
                                      Excluir
                                    </button>
                                  )}
                                </div>
                              ) : isCurrentWeek ? (
                                <button
                                  onClick={() => {
                                    setSelected({ day: d.id, slot: s.id });
                                    setForm(emptyForm);
                                  }}
                                  className="no-print w-full rounded-xl border border-dashed border-border py-4 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent hover:bg-primary-soft/60 hover:text-primary"
                                >
                                  + Agendar
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="print-full rounded-2xl border bg-card p-5 shadow-card">
              <h2 className="font-display text-base font-bold">Resumo da semana</h2>
              <div className="mt-4 space-y-3 text-sm">
                <Row label="Agendamentos" value={String(stats.total)} />
                <Row label="Horários disponíveis" value={String(stats.capacidade)} />
                <Row label="Taxa de ocupação" value={`${stats.ocupacao}%`} />
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${stats.ocupacao}%` }}
                  />
                </div>
                {DAYS.map((d) => (
                  <Row
                    key={d.id}
                    label={d.label}
                    value={`${stats.porDia.get(d.id) ?? 0} aula(s)`}
                  />
                ))}
              </div>
            </div>

            <ListCard
              title="Por professor"
              empty="Nenhum agendamento nesta semana."
              items={stats.porProfessor}
            />
            <ListCard
              title="Por turma"
              empty="Nenhum agendamento nesta semana."
              items={stats.porTurma}
            />
          </div>
        )}
      </main>

      <footer className="mt-6 border-t bg-card py-7 text-center text-sm text-muted-foreground">
        <p className="font-display font-bold text-primary">
          CETI Landri Sales — Laboratório de Informática
        </p>
        <p className="mt-1">Desenvolvido por: Sebastião Martins 3ºA TDS</p>
      </footer>

      {selected && (
        <Modal onClose={() => setSelected(null)} title="Novo agendamento">
          <p className="mb-4 text-sm text-muted-foreground">
            {DAYS.find((d) => d.id === selected.day)?.label} •{" "}
            {SLOTS.find((s) => s.id === selected.slot)?.label}
          </p>
          <form onSubmit={submit} className="space-y-3">
            <Field
              label="Turma"
              value={form.turma}
              onChange={(v) => setForm({ ...form, turma: v })}
              placeholder="Ex.: 3º A TDS"
              required
            />
            <Field
              label="Professor(a)"
              value={form.professor}
              onChange={(v) => setForm({ ...form, professor: v })}
              placeholder="Nome do professor"
              required
            />
            <Field
              label="Disciplina (opcional)"
              value={form.disciplina}
              onChange={(v) => setForm({ ...form, disciplina: v })}
              placeholder="Ex.: Programação Web"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
              >
                Salvar agendamento
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <Modal onClose={() => setPendingDelete(null)} title="Excluir agendamento">
          <p className="mb-4 text-sm text-muted-foreground">
            Para remover o professor deste horário, informe a senha da secretaria.
          </p>
          <form onSubmit={confirmDelete} className="space-y-3">
            <Field
              label="Senha"
              type="password"
              value={pass}
              onChange={(v) => {
                setPass(v);
                setPassError("");
              }}
              placeholder="••••••••"
              required
            />
            {passError && <p className="text-sm text-destructive">{passError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
              >
                Confirmar exclusão
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toast && (
        <div className="no-print fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  progress,
}: {
  label: string;
  value: string;
  hint?: string;
  progress?: number;
}) {
  return (
    <div className="print-full rounded-2xl border bg-card p-4 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold text-primary">{value}</p>
      {typeof progress === "number" && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ListCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: [string, number][];
  empty: string;
}) {
  return (
    <div className="print-full rounded-2xl border bg-card p-5 shadow-card">
      <h2 className="font-display text-base font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {items.map(([name, count]) => (
            <li key={name} className="flex items-center justify-between gap-3">
              <span className="truncate">{name}</span>
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                {count} aula(s)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
