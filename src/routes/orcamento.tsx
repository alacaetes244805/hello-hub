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

function MonthSection({
  month,
  aberto,
  onToggle,
}: {
  month: { nome: string; slug: string };
  aberto: boolean;
  onToggle: () => void;
}) {
  const fetchMes = useServerFn(getOrcamentoMes);
  const relatorioQuery = useQuery({
    queryKey: ["orcamento-mes-novo", month.slug],
    enabled: aberto,
    queryFn: () =>
      fetchMes({
        data: { nome: month.nome, slug: month.slug },
      }),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50"
        aria-expanded={aberto}
      >
        <span className="flex items-center gap-3">
          {aberto ? (
            <ChevronDown className="h-5 w-5 shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0" />
          )}
          <span className="text-base font-bold">{month.nome}</span>
        </span>

        <span className="text-xs text-muted-foreground">
          {aberto ? "Ocultar demonstrativo" : "Ver demonstrativo"}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-border bg-muted/10 p-4 sm:p-6">
          {relatorioQuery.isLoading ? (
            <div className="flex min-h-[180px] items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Abrindo {month.nome}...
            </div>
          ) : relatorioQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-center">
              <p className="font-medium text-destructive">
                Não foi possível carregar {month.nome}.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {relatorioQuery.error instanceof Error
                  ? relatorioQuery.error.message
                  : "Verifique a estrutura da aba mensal."}
              </p>
            </div>
          ) : relatorioQuery.data ? (
            <Demonstrativo relatorio={relatorioQuery.data} />
          ) : null}
        </div>
      )}
    </div>
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
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50"
      >
        <span className="mt-1 shrink-0">
          {aberta ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-foreground">
            {linha.organizacao}
          </span>

          <span className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <span className="text-left text-sm">
              <span className="block text-xs text-muted-foreground">Orçamento</span>
              <Money value={linha.orcamento} />
            </span>

            <span className="text-left text-sm">
              <span className="block text-xs text-muted-foreground">Total</span>
              <Money value={linha.utilizado} />
            </span>

            <span className="text-left text-sm">
              <span className="block text-xs text-muted-foreground">Restante</span>
              <Money value={linha.restante} />
            </span>
          </span>
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
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/50"
      >
        <span className="mt-1 shrink-0">
          {aberta ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-foreground">
            {linha.organizacao}
          </span>

          <span className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <span className="text-left text-sm">
              <span className="block text-xs text-muted-foreground">Orçamento</span>
              <Money value={linha.orcamento} />
            </span>

            <span className="text-left text-sm">
              <span className="block text-xs text-muted-foreground">Total</span>
              <Money value={linha.utilizado} />
            </span>

            <span className="text-left text-sm">
              <span className="block text-xs text-muted-foreground">Restante</span>
              <Money value={linha.restante} />
            </span>
          </span>
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

  const mesesQuery = useQuery({
    queryKey: ["orcamento-meses"],
    queryFn: () => fetchMeses(),
  });

  const [mesAberto, setMesAberto] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Início
          </a>
          <div className="mt-4">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Ala Caetés
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Orçamento</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione um mês para visualizar o demonstrativo.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {mesesQuery.isLoading ? (
          <div className="flex min-h-[250px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Localizando os meses...
          </div>
        ) : mesesQuery.isError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="font-medium text-destructive">
                Não foi possível localizar as abas mensais.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {mesesQuery.error instanceof Error
                  ? mesesQuery.error.message
                  : "Verifique a conexão com o Google Sheets."}
              </p>
            </CardContent>
          </Card>
        ) : !mesesQuery.data?.meses.length ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma aba com mês e ano foi encontrada.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mesesQuery.data.meses.map((mes) => (
              <MonthSection
                key={mes.slug}
                month={mes}
                aberto={mes.slug === mesAberto}
                onToggle={() =>
                  setMesAberto((atual) =>
                    atual === mes.slug ? "" : mes.slug,
                  )
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

