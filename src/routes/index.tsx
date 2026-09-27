import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownCircle, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ala Caetés" },
      { name: "description", content: "Acesse lançamentos e orçamento da Ala Caetés." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Ala Caetés</h1>
            <p className="text-sm text-muted-foreground">Controle de orçamento</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bem-vindo</h2>
          <p className="mt-1 text-muted-foreground">Escolha uma opção para continuar.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/lancamento" className="group">
            <Card className="h-full transition-colors group-hover:border-primary group-hover:bg-accent">
              <CardContent className="flex min-h-36 flex-col justify-between gap-6 p-6">
                <ArrowDownCircle className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">LANÇAMENTO</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Registrar e consultar lançamentos</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/orcamento" className="group">
            <Card className="h-full transition-colors group-hover:border-primary group-hover:bg-accent">
              <CardContent className="flex min-h-36 flex-col justify-between gap-6 p-6">
                <Wallet className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">ORÇAMENTO</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Consultar os orçamentos mensais</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

