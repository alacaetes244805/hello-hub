import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getOrcamentoMes } from "@/lib/sheets.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/orcamento/$mesSlug")({
  head: () => ({ meta: [{ title: "Relatório mensal — Ala Caetés" }, { name: "description", content: "Resumo e gastos do orçamento mensal da Ala Caetés." }] }),
  loader: ({ params }) => ({ mesSlug: params.mesSlug }),
  component: Relatorio,
});

function Relatorio() {
  const { mesSlug } = Route.useLoaderData();
  const fetchMes = useServerFn(getOrcamentoMes);
  const [aberta, setAberta] = useState<string | null>(null);
    const nomeMes = mesSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const { data, isLoading, isError } = useQuery({ queryKey: ["orcamento-mes", mesSlug], queryFn: () => fetchMes({ data: { nome: nomeMes } }) });
  if (isLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando relatório...</div>;
    if (isError) return <div className="p-6 text-center text-muted-foreground">Não foi possível carregar os dados da planilha. Verifique a conexão do Google Sheets e tente novamente.</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Relatório não encontrado.</div>;
  if (data.organizacoes.length === 0) return <div className="min-h-screen bg-background"><header className="border-b border-border bg-card"><div className="mx-auto max-w-3xl px-4 py-5"><a href="/orcamento" className="text-sm text-muted-foreground">← Meses disponíveis</a><h1 className="mt-2 text-xl font-bold text-foreground">{data.nome}</h1></div></header><main className="mx-auto max-w-3xl px-4 py-10 text-center text-muted-foreground">A aba foi encontrada, mas não foram identificadas linhas de orçamento. Confira se ela possui uma coluna de organização e colunas de orçamento, semanas ou gastos.</main></div>;
  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-card"><div className="mx-auto max-w-3xl px-4 py-5"><a href="/orcamento" className="text-sm text-muted-foreground">← Meses disponíveis</a><h1 className="mt-2 text-xl font-bold text-foreground">{data.nome}</h1></div></header><main className="mx-auto max-w-3xl space-y-4 px-4 py-6"><div className="grid gap-3 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-sm">Orçamento</CardTitle></CardHeader><CardContent className="text-lg font-bold">{data.totalOrcamento}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Utilizado</CardTitle></CardHeader><CardContent className="text-lg font-bold">{data.totalUtilizado}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Restante</CardTitle></CardHeader><CardContent className="text-lg font-bold">{data.totalRestante}</CardContent></Card></div>{data.organizacoes.map((org) => { const isOpen = aberta === org.organizacao; return <Card key={org.organizacao}><button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setAberta(isOpen ? null : org.organizacao)}><span className="flex-1 font-semibold text-foreground">{org.organizacao}</span>{isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>{isOpen && <CardContent className="grid gap-3 border-t pt-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Orçamento</p><p className="font-medium">{org.orcamento}</p></div><div><p className="text-xs text-muted-foreground">Semanas</p><p className="font-medium">{org.semanas.join(" · ") || "—"}</p></div><div><p className="text-xs text-muted-foreground">Utilizado / restante</p><p className="font-medium">{org.utilizado} / {org.restante}</p></div></CardContent>}</Card>; })}</main></div>;
}
