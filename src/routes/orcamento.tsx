import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { getOrcamentoMes, getOrcamentoMeses } from "@/lib/sheets.functions";
import type { OrcamentoMes, OrcamentoOrganizacao } from "@/lib/sheets.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Controle do Orçamento — Ala Caetés" },
      { name: "description", content: "Painel de controle do orçamento mensal da Ala Caetés." },
    ],
  }),
  component: Orcamento,
});

function displayMoney(value: string) {
  return value || "—";
}

function organizationAnswer(data: OrcamentoMes, name: string): OrcamentoOrganizacao | undefined {
  const wanted = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return data.organizacoes.find((org) =>
    org.organizacao.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(wanted),
  );
}

function parseMoney(value: string): number {\n  const raw = value.replace(/[^0-9,-]/g, "").replace(/\\./g, "").replace(",", ".");\n  const parsed = Number.parseFloat(raw);\n  return Number.isFinite(parsed) ? parsed : 0;\n}\n\nfunction answerQuestion(question: string, data: OrcamentoMes): string {
  const q = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (q.includes("esta semana")) {
    return "Qual semana você deseja consultar?";
  }

  const weekMatch = q.match(/semana\s*([1-5])/);
  if (weekMatch) {
    const index = Number(weekMatch[1]) - 1;
    if (q.includes("cada organizacao") || q.includes("cada organiz")) {
      return data.organizacoes
        .map((org) => `${org.organizacao}: ${displayMoney(org.semanas[index])}`)
        .join(" · ");
    }
    const orgNames = ["sociedade de socorro", "quorum de elderes", "secretaria", "agua mineral", "centro de distribuicao", "obra missionaria", "thf"];
    const matchedName = orgNames.find((name) => q.includes(name));
    if (matchedName) {
      const org = organizationAnswer(data, matchedName);
      return org ? `${org.organizacao} — Semana ${index + 1}: ${displayMoney(org.semanas[index])}` : "Não encontrei essa informação nos dados disponíveis.";
    }
    const total = data.organizacoes.reduce((sum, org) => {
      const raw = org.semanas[index] ?? "";
      const value = Number(raw.replace(/[^0-9,-]/g, "").replace(/\./g, "").replace(",", "."));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    return total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  if (q.includes("quanto temos") || q.includes("orcamento inicial") || q.includes("quanto ainda temos")) {
    if (q.includes("ainda temos")) return `Orçamento restante: ${displayMoney(data.totalRestante)}`;
    return `Orçamento inicial: ${displayMoney(data.totalOrcamento)}`;
  }

  if (q.includes("quanto ja gastamos") || q.includes("total gasto") || q.includes("quanto gastamos")) {
    return `Total gasto: ${displayMoney(data.totalUtilizado)}`;
  }

  const names = ["sociedade de socorro", "quorum de elderes", "secretaria", "agua mineral", "centro de distribuicao", "obra missionaria", "thf"];
  const matched = names.find((name) => q.includes(name));
  if (matched) {
    const org = organizationAnswer(data, matched);
    if (!org) return "Não encontrei essa informação nos dados disponíveis.";
    return `${org.organizacao} — Orçamento: ${displayMoney(org.orcamento)} · Gasto: ${displayMoney(org.utilizado)} · Restante: ${displayMoney(org.restante)}`;
  }

  return "Não encontrei essa informação nos dados disponíveis.";
}

async function answerComparison(
  question: string,
  data: OrcamentoMes,
  meses: Array<{ nome: string; slug: string }>,
  fetchMes: ReturnType<typeof useServerFn<typeof getOrcamentoMes>>,
): Promise<string | null> {
  const q = question.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
  if (!q.includes("compare") && !q.includes("comparar") && !q.includes("mes")) return null;

  const matches = meses.filter((mes) => {
    const normalized = mes.nome.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
    return q.includes(normalized);
  });
  const unique = matches.filter((mes, index, arr) => arr.findIndex((x) => x.slug === mes.slug) === index);
  if (unique.length < 2) return null;

  const first = unique[0];
  const second = unique[1];
  const [a, b] = await Promise.all([
    first.slug === data.slug ? Promise.resolve(data) : fetchMes({ data: { nome: first.slug, slug: first.slug } }),
    second.slug === data.slug ? Promise.resolve(data) : fetchMes({ data: { nome: second.slug, slug: second.slug } }),
  ]);

  const gastoA = parseMoney(a.totalUtilizado);
  const gastoB = parseMoney(b.totalUtilizado);
  const diferenca = Math.abs(gastoA - gastoB).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${a.nome}: ${a.totalUtilizado} · ${b.nome}: ${b.totalUtilizado} · Diferença: ${diferenca}`;
}

function Money({ value }: { value: string }) {
  return <span className="font-semibold tabular-nums">{displayMoney(value)}</span>;
}

function OrganizationRow({ org }: { org: OrcamentoOrganizacao }) {
  const [open, setOpen] = useState(false);
  const isSecretaria = org.tipo === "grupo" && (org.subcategorias?.length ?? 0) > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50 sm:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(110px,1fr))]"
      >
        <span className="flex min-w-0 items-center gap-2 font-medium">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="truncate">{org.organizacao}</span>
        </span>
        <Money value={org.orcamento} />
        <Money value={org.utilizado} />
        <Money value={org.restante} />
      </button>

      {open && !isSecretaria && (
        <div className="border-t border-border bg-muted/20 p-4">
          <div className="grid gap-2 sm:grid-cols-5">
            {org.semanas.map((value, index) => (
              <div key={index} className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Semana {index + 1}</p>
                <p className="mt-1"><Money value={value} /></p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-6 border-t border-border pt-3 text-sm">
            <span>Total Gasto: <Money value={org.utilizado} /></span>
            <span>Restante: <Money value={org.restante} /></span>
          </div>
        </div>
      )}

      {open && isSecretaria && (
        <div className="space-y-2 border-t border-border bg-muted/20 p-4">
          {org.subcategorias?.map((sub) => <SubcategoryRow key={sub.organizacao} org={sub} />)}
        </div>
      )}
    </div>
  );
}

function SubcategoryRow({ org }: { org: OrcamentoOrganizacao }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-3 text-left hover:bg-accent/50 sm:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(110px,1fr))]"
      >
        <span className="flex min-w-0 items-center gap-2 font-medium">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="truncate">{org.organizacao}</span>
        </span>
        <Money value={org.orcamento} />
        <Money value={org.utilizado} />
        <Money value={org.restante} />
      </button>
      {open && (
        <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-5">
          {org.semanas.map((value, index) => (
            <div key={index} className="rounded-md bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground">Semana {index + 1}</p>
              <p className="mt-1"><Money value={value} /></p>
            </div>
          ))}
          <div className="sm:col-span-5 flex flex-wrap gap-6 border-t border-border pt-3 text-sm">
            <span>Total Gasto: <Money value={org.utilizado} /></span>
            <span>Restante: <Money value={org.restante} /></span>
          </div>
        </div>
      )}
    </div>
  );
}

function Orcamento() {
  const fetchMeses = useServerFn(getOrcamentoMeses);
  const fetchMes = useServerFn(getOrcamentoMes);
  const mesesQuery = useQuery({ queryKey: ["orcamento-meses"], queryFn: () => fetchMeses() });
  const [mesSlug, setMesSlug] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");\n  const [questionLoading, setQuestionLoading] = useState(false);

  const selectedSlug = mesSlug || mesesQuery.data?.meses[0]?.slug || "";

  const relatorioQuery = useQuery({
    queryKey: ["orcamento-mes", selectedSlug],
    enabled: Boolean(selectedSlug),
    queryFn: () => fetchMes({ data: { nome: selectedSlug, slug: selectedSlug } }),
  });
  const relatorio = relatorioQuery.data;

  const organizations = useMemo(() => relatorio?.organizacoes ?? [], [relatorio]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</a>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-primary">Ala Caetés</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Controle do Orçamento</h1>
            </div>
            <label className="flex min-w-[220px] flex-col gap-1 text-sm font-medium">
              Mês
              <select
                value={selectedSlug}
                onChange={(event) => { setMesSlug(event.target.value); setAnswer(""); }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {mesesQuery.data?.meses.map((mes) => <option key={mes.slug} value={mes.slug}>{mes.nome}</option>)}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {mesesQuery.isLoading || relatorioQuery.isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando dados da planilha...
          </div>
        ) : relatorioQuery.isError ? (
          <Card><CardContent className="p-6 text-center text-destructive">Não foi possível carregar os dados da planilha. Verifique a conexão do Google Sheets e tente novamente.</CardContent></Card>
        ) : relatorio ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Orçamento Inicial</CardTitle></CardHeader><CardContent className="text-2xl font-bold"><Money value={relatorio.totalOrcamento} /></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Gasto</CardTitle></CardHeader><CardContent className="text-2xl font-bold"><Money value={relatorio.totalUtilizado} /></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Orçamento Restante</CardTitle></CardHeader><CardContent className="text-2xl font-bold"><Money value={relatorio.totalRestante} /></CardContent></Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organizações</CardTitle>
                <div className="hidden grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(110px,1fr))] gap-3 border-b border-border pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                  <span>Organização</span><span>Inicial</span><span>Gasto</span><span>Restante</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-0 pb-4">
                {organizations.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-muted-foreground">Não encontrei organizações na estrutura de orçamento desta aba.</p>
                ) : organizations.map((org) => <OrganizationRow key={org.organizacao} org={org} />)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" /> Consultar orçamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={async (event) => { if (event.key === "Enter" && question.trim()) { setQuestionLoading(true); const comparison = await answerComparison(question, relatorio, mesesQuery.data?.meses ?? [], fetchMes); setAnswer(comparison ?? answerQuestion(question, relatorio)); setQuestionLoading(false); } }}
                    placeholder="Ex.: Quanto gastamos na Semana 2?"
                    className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button type="button" onClick={async () => { if (!question.trim()) return; setQuestionLoading(true); const comparison = await answerComparison(question, relatorio, mesesQuery.data?.meses ?? [], fetchMes); setAnswer(comparison ?? answerQuestion(question, relatorio)); setQuestionLoading(false); }} className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Consultar
                  </button>
                </div>
                {answer && <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">{answer}</div>}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
