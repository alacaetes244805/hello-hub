import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { getOrcamentoMes, getOrcamentoMeses } from "@/lib/sheets.functions";
import type { OrcamentoLinha, OrcamentoMes } from "@/lib/sheets.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Orçamento — Ala Caetés" },
      { name: "description", content: "Demonstrativo mensal do orçamento da Ala Caetés." },
    ],
  }),
  component: Orcamento,
});

function Money({ value }: { value: string }) {
  return <span className="font-semibold tabular-nums">{value || "—"}</span>;
}

function MonthButton({
  month,
  selected,
  onClick,
}: {
  month: { nome: string; slug: string };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent",
      ].join(" ")}
    >
      {month.nome}
    </button>
  );
}

function WeekDetails({ linha }: { linha: OrcamentoLinha }) {
  return (
    <div className="border-t border-border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {linha.semanas.map((valor, index) => (
          <div key={index} className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sem. {index + 1}
            </p>
            <p className="mt-1 text-base"><Money value={valor} /></p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
        <div className="rounded-lg bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total Gasto
          </p>
          <p className="mt-1 text-base"><Money value={linha.utilizado} /></p>
        </div>

        <div className="rounded-lg bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Orçamento Restante
          </p>
          <p className="mt-1 text-base"><Money value={linha.restante} /></p>
        </div>
      </div>
    </div>
  );
}

function LinhaExpansivel({ linha }: { linha: OrcamentoLinha }) {
  const [aberta, setAberta] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setAberta((value) => !value)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          {aberta ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="truncate font-semibold">{linha.organizacao}</span>
        </span>

        <span className="hidden min-w-[120px] text-right text-sm sm:block">
          <span className="block text-xs text-muted-foreground">Orçamento</span>
          <Money value={linha.orcamento} />
        </span>

        <span className="min-w-[100px] text-right text-sm">
          <span className="block text-xs text-muted-foreground">Total</span>
          <Money value={linha.utilizado} />
        </span>

        <span className="min-w-[110px] text-right text-sm">
          <span className="block text-xs text-muted-foreground">Restante</span>
          <Money value={linha.restante} />
        </span>
      </button>

      {aberta && <WeekDetails linha={linha} />}
    </div>
  );
}

function Secretaria({
  linha,
  subgrupos,
}: {
  linha: OrcamentoLinha;
  subgrupos: OrcamentoLinha[];
}) {
  const [aberta, setAberta] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setAberta((value) => !value)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          {aberta ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="truncate font-semibold">{linha.organizacao}</span>
        </span>

        <span className="hidden min-w-[120px] text-right text-sm sm:block">
          <span className="block text-xs text-muted-foreground">Orçamento</span>
          <Money value={linha.orcamento} />
        </span>

        <span className="min-w-[100px] text-right text-sm">
          <span className="block text-xs text-muted-foreground">Total</span>
          <Money value={linha.utilizado} />
        </span>

        <span className="min-w-[110px] text-right text-sm">
          <span className="block text-xs text-muted-foreground">Restante</span>
          <Money value={linha.restante} />
        </span>
      </button>

      {aberta && (
        <div className="space-y-3 border-t border-border bg-muted/20 p-4">
          <WeekDetails linha={linha} />

          <div>
            <p className="mb-2 px-1 text-sm font-semibold">Subgrupos da Secretaria</p>
            <div className="space-y-2">
              {subgrupos.map((subgrupo) => (
                <LinhaExpansivel key={subgrupo.organizacao} linha={subgrupo} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Demonstrativo({ relatorio }: { relatorio: OrcamentoMes }) {
  const secretaria = relatorio.organizacoes.find(
    (linha) => linha.organizacao.trim().toLowerCase() === "secretaria",
  );

  const principais = relatorio.organizacoes.filter(
    (linha) => linha.organizacao.trim().toLowerCase() !== "secretaria",
  );

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Inicial</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold"><Money value={relatorio.orcamentoInicial} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold"><Money value={relatorio.totalGasto} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Restante</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold"><Money value={relatorio.orcamentoRestante} /></CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demonstrativo do mês</CardTitle>
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_100px_110px] gap-3 border-b border-border pb-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span className="text-left">Categoria</span>
            <span>Orçamento</span>
            <span>Total Gasto</span>
            <span>Restante</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 px-4 pb-6">
          {principais.map((linha) => <LinhaExpansivel key={linha.organizacao} linha={linha} />)}
          {secretaria && <Secretaria linha={secretaria} subgrupos={relatorio.subgruposSecretaria} />}
        </CardContent>
      </Card>
    </>
  );
}

function Orcamento() {
  const fetchMeses = useServerFn(getOrcamentoMeses);
  const fetchMes = useServerFn(getOrcamentoMes);

  const mesesQuery = useQuery({
    queryKey: ["orcamento-meses"],
    queryFn: () => fetchMeses(),
  });

  const [mesSlug, setMesSlug] = useState("");
  const selectedSlug = mesSlug || mesesQuery.data?.meses[0]?.slug || "";

  const relatorioQuery = useQuery({
    queryKey: ["orcamento-mes-novo", selectedSlug],
    enabled: Boolean(selectedSlug),
    queryFn: () => fetchMes({ data: { nome: selectedSlug, slug: selectedSlug } }),
  });

  const selectedMonth = mesesQuery.data?.meses.find((mes) => mes.slug === selectedSlug);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</a>
          <div className="mt-4">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">Ala Caetés</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Orçamento</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecione uma aba mensal para abrir o demonstrativo.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {mesesQuery.isLoading ? (
          <div className="flex min-h-[250px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Localizando os meses...
          </div>
        ) : mesesQuery.isError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="font-medium text-destructive">Não foi possível localizar as abas mensais.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {mesesQuery.error instanceof Error ? mesesQuery.error.message : "Verifique a conexão com o Google Sheets."}
              </p>
            </CardContent>
          </Card>
        ) : !mesesQuery.data?.meses.length ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">Nenhuma aba com mês e ano foi encontrada.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-lg">Meses encontrados na planilha</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {mesesQuery.data.meses.map((mes) => (
                  <MonthButton
                    key={mes.slug}
                    month={mes}
                    selected={mes.slug === selectedSlug}
                    onClick={() => setMesSlug(mes.slug)}
                  />
                ))}
              </CardContent>
            </Card>

            {relatorioQuery.isLoading ? (
              <div className="flex min-h-[250px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abrindo {selectedMonth?.nome ?? selectedSlug}...
              </div>
            ) : relatorioQuery.isError ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="font-medium text-destructive">Não foi possível carregar {selectedMonth?.nome ?? selectedSlug}.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {relatorioQuery.error instanceof Error ? relatorioQuery.error.message : "Verifique a estrutura da aba mensal."}
                  </p>
                </CardContent>
              </Card>
            ) : relatorioQuery.data ? (
              <Demonstrativo relatorio={relatorioQuery.data} />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
