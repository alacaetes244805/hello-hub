import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  PlusCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { addLancamento, getLancamentos } from "@/lib/sheets.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Orçamento — Ala Caetés" },
      {
        name: "description",
        content:
          "Registre entradas e saídas do orçamento da Ala Caetés direto na planilha do Google Sheets.",
      },
      { property: "og:title", content: "Controle de Orçamento — Ala Caetés" },
      {
        property: "og:description",
        content:
          "Registre entradas e saídas do orçamento da Ala Caetés direto na planilha do Google Sheets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const ORGANIZACOES = [
  { codigo: "1", nome: "Sociedade de Socorro" },
  { codigo: "2", nome: "Quórum de Élderes" },
  { codigo: "3", nome: "Rapazes" },
  { codigo: "4", nome: "Moças" },
  { codigo: "6", nome: "Primária" },
  { codigo: "8", nome: "Secretaria" },
  { codigo: "9", nome: "Água Mineral" },
  { codigo: "11", nome: "Obra Missionária" },
];

function formatValorInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number.parseInt(digits, 10);
  return `R$${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function todayBR(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${now.getFullYear()}`;
}

function Index() {
  const queryClient = useQueryClient();
  const fetchLancamentos = useServerFn(getLancamentos);
  const submitLancamento = useServerFn(addLancamento);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["lancamentos"],
    queryFn: () => fetchLancamentos(),
  });

  const [organizacao, setOrganizacao] = useState("");
  const [data, setData] = useState(todayBR());
  const [tipo, setTipo] = useState<"ENTRADA" | "SAÍDA">("SAÍDA");
  const [valor, setValor] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const org = ORGANIZACOES.find((o) => o.nome === organizacao);
    if (!org) {
      toast.error("Selecione a organização");
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      toast.error("Data inválida — use dd/mm/aaaa");
      return;
    }
    if (!valor) {
      toast.error("Informe o valor");
      return;
    }
    if (!finalidade.trim()) {
      toast.error("Descreva a finalidade");
      return;
    }

    setSalvando(true);
    try {
      const result = await submitLancamento({
        data: {
          codigo: org.codigo,
          organizacao: org.nome,
          data,
          tipo,
          valor,
          finalidade: finalidade.trim(),
        },
      });
      toast.success(`Lançamento registrado! Pagamento nº ${result.pagamento}`);
      setValor("");
      setFinalidade("");
      await queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar na planilha",
      );
    } finally {
      setSalvando(false);
    }
  }

  const lancamentos = data?.lancamentos ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">
              Controle de Orçamento
            </h1>
            <p className="text-sm text-muted-foreground">Ala Caetés</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-5 w-5 text-primary" />
              Novo lançamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organizacao">Organização</Label>
                  <Select value={organizacao} onValueChange={setOrganizacao}>
                    <SelectTrigger id="organizacao">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZACOES.map((o) => (
                        <SelectItem key={o.codigo} value={o.nome}>
                          {o.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={tipo === "SAÍDA" ? "default" : "outline"}
                      onClick={() => setTipo("SAÍDA")}
                      className="w-full"
                    >
                      <ArrowDownCircle className="mr-1 h-4 w-4" />
                      Saída
                    </Button>
                    <Button
                      type="button"
                      variant={tipo === "ENTRADA" ? "default" : "outline"}
                      onClick={() => setTipo("ENTRADA")}
                      className="w-full"
                    >
                      <ArrowUpCircle className="mr-1 h-4 w-4" />
                      Entrada
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    value={valor}
                    onChange={(e) =>
                      setValor(formatValorInput(e.target.value))
                    }
                    placeholder="R$0,00"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finalidade">Finalidade</Label>
                <Textarea
                  id="finalidade"
                  value={finalidade}
                  onChange={(e) => setFinalidade(e.target.value)}
                  placeholder="Ex: Compra de material para a atividade..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={salvando}>
                {salvando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando na planilha...
                  </>
                ) : (
                  "Registrar lançamento"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimos lançamentos</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lancamentos.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {isFetching ? "Carregando..." : "Nenhum lançamento encontrado."}
              </p>
            )}
            {lancamentos.map((l) => (
              <div
                key={`${l.row}-${l.pagamento}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {l.organizacao}
                    </span>
                    <Badge
                      variant={l.tipo === "ENTRADA" ? "default" : "secondary"}
                    >
                      {l.tipo}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {l.finalidade}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.data}
                    {l.pagamento ? ` · Pagamento nº ${l.pagamento}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-foreground">
                  {l.valor}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
