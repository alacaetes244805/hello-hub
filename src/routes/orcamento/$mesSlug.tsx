import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orcamento/$mesSlug")({
  component: RelatorioMensal,
});

function RelatorioMensal() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="text-xl font-bold">Demonstrativo mensal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione o mês na página de Orçamento.
        </p>
        <a
          href="/orcamento"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Abrir Orçamento
        </a>
      </main>
    </div>
  );
}
