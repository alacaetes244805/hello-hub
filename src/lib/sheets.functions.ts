import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SPREADSHEET_ID = "1ZWBwhXmwkALhHEuF9eGSJ3g2QvoJV75hQ8TpjAhT4dg";
const SHEET_NAME = "CONTROLE ENT|SAI";
const READ_RANGE = `'${SHEET_NAME}'!A1:H200`;

export type Lancamento = {
  row: number;
  codigo: string;
  organizacao: string;
  data: string;
  tipo: string;
  valor: string;
  finalidade: string;
  pagamento: string;
};

export type OrcamentoOrganizacao = {
  organizacao: string;
  orcamento: string;
  semanas: string[];
  utilizado: string;
  restante: string;
  tipo?: "organizacao" | "grupo" | "subcategoria";
  subcategorias?: OrcamentoOrganizacao[];
};

export type OrcamentoMes = {
  nome: string;
  slug: string;
  organizacoes: OrcamentoOrganizacao[];
  totalOrcamento: string;
  totalUtilizado: string;
  totalRestante: string;
};


function gatewayBase() {
  return `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SPREADSHEET_ID}/values`;
}

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Credenciais do Google Sheets não configuradas");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
}

async function readSheetRange(sheetName: string): Promise<string[][]> {
  const range = `'${sheetName.replaceAll("'", "''")}'!A1:Z200`;
  const res = await fetch(`${gatewayBase()}/${range}`, {
    headers: gatewayHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets budget read failed [${res.status}]: ${body}`);
    throw new Error(`Falha ao ler a aba de orçamento [${res.status}]`);
  }
  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

function normalizeTabName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function isMonthlyTab(value: string): boolean {
  return /^(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+\d{4})?$/i.test(
    value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
}

function numberValue(value: string): number {
  const normalized = value
    .replace(/R\$\s?/i, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function headerIndex(headers: string[], names: string[]): number {
  return headers.findIndex((header) => {
    const normalized = header
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase();
    return names.some((name) => normalized.includes(name));
  });
}

function cleanName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\\s+/g, " ");
}

function moneyCell(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return formatMoney(numberValue(raw));
}

function findSummaryValue(rows: string[][], labels: string[], columns: number[]): string {
  const wanted = labels.map(cleanName);
  for (let r = 14; r <= 16 && r < rows.length; r++) {
    const row = rows[r] ?? [];
    const labelText = row.slice(0, 3).map((v) => cleanName(v ?? "")).join(" ");
    if (wanted.some((label) => labelText.includes(label))) {
      for (const column of columns) {
        if ((row[column] ?? "").trim()) return moneyCell(row[column]);
      }
    }
  }
  return "";
}

function normalizeBudgetRows(rows: string[][]): OrcamentoMes["organizacoes"] {
  const headerRowIndex = rows.findIndex((row) => {
    const org = cleanName(row[1] ?? "");
    const budget = cleanName(row[2] ?? "");
    return org.includes("organizacao") && budget.includes("orcamento");
  });
  if (headerRowIndex < 0) return [];

  const parsed = rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const nome = (row[1] ?? "").trim();
      if (!nome) return null;
      return {
        organizacao: nome,
        orcamento: moneyCell(row[2]),
        semanas: [3, 4, 5, 6, 7].map((i) => moneyCell(row[i])),
        utilizado: moneyCell(row[8]),
        restante: moneyCell(row[9]),
        tipo: "organizacao" as const,
      };
    })
    .filter((item): item is OrcamentoOrganizacao => Boolean(item))
    .filter((item) => {
      const n = cleanName(item.organizacao);
      return !["organizacao", "total", "totais", "orcamento inicial", "total gasto", "orcamento restante"].includes(n);
    });

  const secretaria = parsed.find((item) => cleanName(item.organizacao) === "secretaria");
  if (!secretaria) return parsed;

  const subNames = new Set(["agua mineral", "centro de distribuicao", "obra missionaria", "thf"]);
  const subcategorias = parsed
    .filter((item) => subNames.has(cleanName(item.organizacao)))
    .map((item) => ({ ...item, tipo: "subcategoria" as const }));

  secretaria.tipo = "grupo";
  secretaria.subcategorias = subcategorias;

  return parsed.filter((item) => !subNames.has(cleanName(item.organizacao)));
}    const rows = await readSheetRange(nomeAba);
    const organizacoes = normalizeBudgetRows(rows);

    // Os cards superiores usam os valores do bloco de resumo da própria aba.
    // Não recalculamos esses totais a partir das organizações.
    const totalOrcamento = findSummaryValue(rows, ["orcamento inicial"], [2]);
    const totalUtilizado = findSummaryValue(rows, ["total gasto"], [8, 2]);
    const totalRestante = findSummaryValue(rows, ["orcamento restante"], [9, 2]);

    return {
        organizacao: nome,
        orcamento: moneyCell(row[2]),
        semanas: [3, 4, 5, 6, 7].map((i) => moneyCell(row[i])),
        utilizado: moneyCell(row[8]),
        restante: moneyCell(row[9]),
        tipo: "organizacao" as const,
      };
    })
    .filter((item): item is OrcamentoOrganizacao => Boolean(item))
    .filter((item) => {
      const n = cleanName(item.organizacao);
      return !["organizacao", "total", "totais", "orcamento inicial", "total gasto", "orcamento restante"].includes(n);
    });

  const secretaria = parsed.find((item) => cleanName(item.organizacao) === "secretaria");
  if (!secretaria) return parsed;

  const subNames = new Set(["agua mineral", "centro de distribuicao", "obra missionaria", "thf"]);
  const subcategorias = parsed
    .filter((item) => subNames.has(cleanName(item.organizacao)))
    .map((item) => ({ ...item, tipo: "subcategoria" as const }));

  secretaria.tipo = "grupo";
  secretaria.subcategorias = subcategorias;

  return parsed.filter((item) => !subNames.has(cleanName(item.organizacao)));
}
