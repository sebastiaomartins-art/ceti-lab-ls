import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_PASSWORD,
  DAYS,
  SLOTS,
  currentWeekKey,
  listWeeks,
  loadWeek,
  saveWeek,
  weekRangeLabel,
  type Booking,
  type WeekData,
} from "@/lib/agenda";

export const Route = createFileRoute("/")({
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
    ],
  }),
  component: Index,
});

const emptyForm = { professor: "", turma: "", disciplina: "" };

function Index() {
  const [weekKey, setWeekKey] = useState(() => currentWeekKey());
  const [data, setData] = useState<WeekData>({});
  const [weeks, setWeeks] = useState<string[]>([]);
  const [tab, setTab] = useState<"agenda" | "relatorio">("agenda");
  const [selected, setSelected] = useState<{ day: string; slot: string } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<{ day: string; slot: string } | null>(null);
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const wk = currentWeekKey();
    setWeekKey(wk);
    setData(loadWeek(wk));
    setWeeks(listWeeks());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const isCurrentWeek = weekKey === currentWeekKey();

  function openWeek(wk: string) {
    setWeekKey(wk);
    setData(loadWeek(wk));
    setSelected(null);
  }

  function persist(next: WeekData) {
    setData(next);
    saveWeek(weekKey, next);
    setWeeks(listWeeks());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!form.professor.trim() || !form.turma.trim()) return;
    const key = `${selected.day}|${selected.slot}`;
    persist({
      ...data,
      [key]: {
        professor: form.professor.trim(),
        turma: form.turma.trim(),
        disciplina: form.disciplina.trim(),
        criadoEm: new Date().toISOString(),
      } satisfies Booking,
    });
    setForm(emptyForm);
    setSelected(null);
    setToast("Agendamento salvo com sucesso.");
  }

  function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    if (pass !== ADMIN_PASSWORD) {
      setPassError("Senha incorreta.");
      return;
    }
    const key = `${pendingDelete.day}|${pendingDelete.slot}`;
    const next = { ...data };
    delete next[key];
    persist(next);
    setPendingDelete(null);
    setPass("");
    setPassError("");
    setToast("Professor removido do agendamento.");
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
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg font-bold">
              CL
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">
                Laboratório de Informática
              </h1>
              <p className="text-sm text-muted-foreground">
                CETI Landri Sales — Agenda semanal
              </p>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-secondary p-1">
              {(["agenda", "relatorio"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Imprimir agenda semanal
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-primary-soft px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-secondary-foreground">
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
              className="rounded-lg border bg-card px-3 py-2 text-sm"
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
                className="rounded-lg border bg-card px-3 py-2 text-sm font-medium"
              >
                Voltar para a semana atual
              </button>
            )}
          </div>
        </section>

        {tab === "agenda" ? (
          <div className="print-full overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-36 border-b border-r bg-secondary p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Horário
                  </th>
                  {DAYS.map((d) => (
                    <th
                      key={d.id}
                      className="border-b border-r bg-secondary p-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary-foreground last:border-r-0"
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
                      <td className="border-b border-r bg-secondary/60 p-3 font-medium">
                        {s.label}
                      </td>
                      {isBreak ? (
                        <td
                          colSpan={DAYS.length}
                          className="border-b p-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground"
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
                                <div className="rounded-lg border border-primary/30 bg-primary-soft p-2">
                                  <p className="font-semibold text-secondary-foreground">
                                    {b.turma}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{b.professor}</p>
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
                                      className="no-print mt-1 text-xs font-medium text-destructive hover:underline"
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
                                  className="no-print w-full rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
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
            <div className="print-full rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="text-base font-bold">Resumo da semana</h2>
              <div className="mt-4 space-y-3 text-sm">
                <Row label="Agendamentos" value={String(stats.total)} />
                <Row label="Horários disponíveis" value={String(stats.capacidade)} />
                <Row label="Taxa de ocupação" value={`${stats.ocupacao}%`} />
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary"
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

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p className="font-medium">CETI Landri Sales — Laboratório de Informática</p>
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
                className="rounded-lg border px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
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
                className="rounded-lg border px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
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
    <div className="print-full rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-base font-bold">{title}</h2>
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
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
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
