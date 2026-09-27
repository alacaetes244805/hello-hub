import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, ChevronUp, Loader2 } from "lucide-react";
import { getOrcamentoMes, getOrcamentoMeses } from "@/lib/sheets.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/orcamento")({
  head: () => ({ meta: [{ title: "Orçamentos — Ala Caetés" }, { name: "description", content: "Consulte os orçamentos mensais da Ala Caetés." }] }),
  component: Orcamento,
});

function Orcamento() {
  const fetchMeses = useServerFn(getOrcamentoMeses);
  const fetchMes = useServerFn(getOrcamentoMes);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [organizacaoAberta, setOrganizacaoAberta] = useState<string | null>(null);
  const mesesQuery = useQuery({ queryKey: ["orcamento-meses"], queryFn: () => fetchMeses() });
  const relatorioQuery = useQuery({
    queryKey: ["orcamento-mes", mesSelecionado],
    enabled: Boolean(mesSelecionado),
    queryFn: () => fetchMes({ data: { nome: mesSelecionado! } }),
  });
  const relatorio = relatorioQuery.data;

  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5"><a href="/" className="text-sm text-muted-foreground">← Início</a><div><h1 className="text-lg font-bold text-foreground">Orçamento</h1><p className="text-sm text-muted-foreground">Ala Caetés</p></div></div></header><main className="mx-auto max-w-3xl space-y-4 px-4 py-6"><h2 className="text-xl font-semibold text-foreground">Meses disponíveis</h2>{mesesQuery.isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando abas...</div> : mesesQuery.data?.meses.map((mes) => <Link key={mes.slug} to="/orcamento/$mesSlug" params={{ mesSlug: mes.slug }} className="block w-full text-left"><Card className="transition-colors hover:bg-accent"><CardContent className="flex items-center gap-3 p-4"><CalendarDays className="h-5 w-5 text-primary" /><span className="flex-1 font-medium text-foreground">{mes.nome}</span><ChevronRight className="h-5 w-5 text-muted-foreground" /></CardContent></Card></Link>)}{mesSelecionado && <section className="space-y-4 pt-4"><h2 className="text-xl font-semibold text-foreground">Relatório de {mesSelecionado}</h2>{relatorioQuery.isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando informações da planilha...</div> : relatorioQuery.isError ? <p className="text-sm text-destructive">Não foi possível carregar os dados da planilha.</p> : relatorio && <><div className="grid gap-3 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-sm">Orçamento</CardTitle></CardHeader><CardContent className="text-lg font-bold">{relatorio.totalOrcamento}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Utilizado</CardTitle></CardHeader><CardContent className="text-lg font-bold">{relatorio.totalUtilizado}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Restante</CardTitle></CardHeader><CardContent className="text-lg font-bold">{relatorio.totalRestante}</CardContent></Card></div>{relatorio.organizacoes.length === 0 ? <p className="text-sm text-muted-foreground">A aba foi encontrada, mas nenhuma organização foi identificada.</p> : relatorio.organizacoes.map((org) => { const aberta = organizacaoAberta === org.organizacao; return <Card key={org.organizacao}><button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOrganizacaoAberta(aberta ? null : org.organizacao)}><span className="flex-1 font-semibold text-foreground">{org.organizacao}</span>{aberta ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>{aberta && <CardContent className="grid gap-3 border-t pt-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Orçamento</p><p className="font-medium">{org.orcamento || "—"}</p></div><div><p className="text-xs text-muted-foreground">Gastos por semana</p><p className="font-medium">{org.semanas.join(" · ") || "—"}</p></div><div><p className="text-xs text-muted-foreground">Utilizado / restante</p><p className="font-medium">{org.utilizado || "—"} / {org.restante || "—"}</p></div></CardContent>}</Card>; })}</>}</section>}</main></div>;
}

