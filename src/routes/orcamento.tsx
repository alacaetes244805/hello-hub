import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import { getOrcamentoMeses } from "@/lib/sheets.functions";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/orcamento")({
  head: () => ({ meta: [{ title: "Orçamentos — Ala Caetés" }, { name: "description", content: "Consulte os orçamentos mensais da Ala Caetés." }] }),
  component: Orcamento,
});

function Orcamento() {
  const fetchMeses = useServerFn(getOrcamentoMeses);
  const { data, isLoading } = useQuery({ queryKey: ["orcamento-meses"], queryFn: () => fetchMeses() });
  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5"><a href="/" className="text-sm text-muted-foreground">← Início</a><div><h1 className="text-lg font-bold text-foreground">Orçamento</h1><p className="text-sm text-muted-foreground">Ala Caetés</p></div></div></header><main className="mx-auto max-w-3xl space-y-4 px-4 py-6"><h2 className="text-xl font-semibold text-foreground">Meses disponíveis</h2>{isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando abas...</div> : data?.meses.map((mes) => <Link key={mes.slug} to="/orcamento/$mesSlug" params={{ mesSlug: mes.slug }}><Card className="transition-colors hover:bg-accent"><CardContent className="flex items-center gap-3 p-4"><CalendarDays className="h-5 w-5 text-primary" /><span className="flex-1 font-medium text-foreground">{mes.nome}</span><ChevronRight className="h-5 w-5 text-muted-foreground" /></CardContent></Card></Link>)}</main></div>;
}
