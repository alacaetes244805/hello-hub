import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Pencil,
  PlusCircle,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import {
  addLancamento,
  deleteLancamento,
  getLancamentos,
  updateLancamento,
  type Lancamento as LancamentoType,
} from "@/lib/sheets.functions";
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

export const Route = createFileRoute("/lancamento")({
  head: () => ({
    meta: [
      { title: "Lançamentos — Ala Caetés" },
      { name: "description", content: "Registre e consulte os lançamentos da Ala Caetés." },
    ],
  }),
  component: Lancamento,
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
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function Lancamento() {
  const queryClient = useQueryClient();
  const fetchLancamentos = useServerFn(getLancamentos);
  const submitLancamento = useServerFn(addLancamento);
  const editLancamento = useServerFn(updateLancamento);
  const removeLancamento = useServerFn(deleteLancamento);

  const { data: resultado, isFetching, refetch } = useQuery({
    queryKey: ["lancamentos"],
    queryFn: () => fetchLancamentos(),
  });

  const [organizacao, setOrganizacao] = useState("");
  const [dataLanc, setDataLanc] = useState(todayBR());
  const [tipo, setTipo] = useState<"ENTRADA" | "SAÍDA">("SAÍDA");
  const [valor, setValor] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<LancamentoType | null>(null);

  function limparFormulario() {
    setOrganizacao("");
    setDataLanc(todayBR());
    setTipo("SAÍDA");
    setValor("");
    setFinalidade("");
    setEditando(null);
  }

  function iniciarEdicao(lancamento: LancamentoType) {
    const confirmado = window.confirm(
      `Tem certeza que deseja editar o lançamento de ${lancamento.organizacao} no valor de ${lancamento.valor}?\\n\\nSe confirmar, o lançamento será aberto no formulário para você alterar os dados.`,
    );

    if (!confirmado) return;

    setEditando(lancamento);
    setOrganizacao(lancamento.organizacao);
    setDataLanc(lancamento.data);
    setTipo(lancamento.tipo === "ENTRADA" ? "ENTRADA" : "SAÍDA");
    setValor(formatValorInput(lancamento.valor));
    setFinalidade(lancamento.finalidade);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const org = ORGANIZACOES.find((o) => o.nome === organizacao);
    if (!org) return void toast.error("Selecione a organização");
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataLanc)) {
      return void toast.error("Data inválida — use dd/mm/aaaa");
    }
    if (!valor) return void toast.error("Informe o valor");
    if (!finalidade.trim()) return void toast.error("Descreva a finalidade");

    setSalvando(true);

    try {
      if (editando) {
        await editLancamento({
          data: {
            row: editando.row,
            pagamento: editando.pagamento,
            codigo: org.codigo,
            organizacao: org.nome,
            data: dataLanc,
            tipo,
            valor,
            finalidade: finalidade.trim(),
          },
        });
        toast.success(`Lançamento nº ${editando.pagamento} atualizado na planilha!`);
      } else {
        const result = await submitLancamento({
          data: {
            codigo: org.codigo,
            organizacao: org.nome,
            data: dataLanc,
            tipo,
            valor,
            finalidade: finalidade.trim(),
          },
        });
        toast.success(`Lançamento registrado! Pagamento nº ${result.pagamento}`);
      }

      limparFormulario();
      await queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar na planilha");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(lancamento: LancamentoType) {
    const confirmado = window.confirm(
      `Excluir o lançamento de ${lancamento.organizacao} no valor de ${lancamento.valor}?\n\nEssa ação também excluirá os dados da planilha.`,
    );

    if (!confirmado) return;

    try {
      await removeLancamento({ data: { row: lancamento.row } });

      if (editando?.row === lancamento.row) {
        limparFormulario();
      }

      toast.success("Lançamento excluído da planilha.");
      await queryClient.invalidateQueries({ queryKey: ["lancamentos"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir o lançamento");
    }
  }

  const lancamentos = resultado?.lancamentos ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            ← Voltar
          </a>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">Lançamentos</h1>
            <p className="text-sm text-muted-foreground">Ala Caetés</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                {editando ? "Editar lançamento" : "Novo lançamento"}
              </span>
              {editando && (
                <Button type="button" variant="outline" size="sm" onClick={limparFormulario}>
                  <X className="mr-1 h-4 w-4" />
                  Cancelar
                </Button>
              )}
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
                    value={dataLanc}
                    onChange={(e) => setDataLanc(e.target.value)}
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
                    onChange={(e) => setValor(formatValorInput(e.target.value))}
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
                ) : editando ? (
                  "Atualizar lançamento"
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
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {lancamentos.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {isFetching ? "Carregando..." : "Nenhum lançamento encontrado."}
              </p>
            )}

            {lancamentos.map((l) => (
              <div key={`${l.row}-${l.pagamento}`} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{l.organizacao}</span>
                      <Badge variant={l.tipo === "ENTRADA" ? "default" : "secondary"}>{l.tipo}</Badge>
                    </div>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{l.finalidade}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {l.data}{l.pagamento ? ` · Pagamento nº ${l.pagamento}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-foreground">{l.valor}</span>
                </div>

                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => iniciarEdicao(l)}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => void handleExcluir(l)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
