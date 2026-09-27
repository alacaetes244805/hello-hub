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
  const res = await fetch(`${gatewayBase()}/${encodeURIComponent(range)}`, {
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
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return names.some((name) => normalized.includes(name));
  });
}

function cleanName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function moneyCell(value: string | undefined): string {
  const raw = (value ?? "").trim();
  return raw ? formatMoney(numberValue(raw)) : "";
}

function findSummaryValue(rows: string[][], labels: string[], columns: number[]): string {
  const wanted = labels.map(cleanName);
  // O resumo está documentado nas linhas 15:17, mas procuramos em toda a
  // área lida para tolerar pequenas mudanças de formatação na aba mensal.
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const labelText = row.slice(0, 3).map((v) => cleanName(v ?? "")).join(" ");
    if (!wanted.some((label) => labelText.includes(label))) continue;

    for (const column of columns) {
      const value = (row[column] ?? "").trim();
      if (value !== "") return moneyCell(value);
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
  const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  const parsed = rows.slice(startIndex)
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
      const nome = cleanName(item.organizacao);
      const ignorar = ["organizacao","organizacoes","organizações","total","totais","orcamento inicial","total gasto","orcamento restante"].includes(nome);
      const temValor = Boolean(item.orcamento || item.utilizado || item.restante || item.semanas.some(Boolean));
      return !ignorar && temValor;
    });

  const secretaria = parsed.find((item) => cleanName(item.organizacao) === "secretaria");
  if (!secretaria) return parsed;

  const subNames = new Set(["agua mineral","centro de distribuicao","obra missionaria","thf"]);
  secretaria.tipo = "grupo";
  secretaria.subcategorias = parsed.filter((item) => subNames.has(cleanName(item.organizacao)))
    .map((item) => ({ ...item, tipo: "subcategoria" as const }));

  return parsed.filter((item) => !subNames.has(cleanName(item.organizacao)));
}

async function readRows(): Promise<string[][]> {
  const res = await fetch(`${gatewayBase()}/${READ_RANGE}`, {
    headers: gatewayHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Sheets read failed [${res.status}]: ${body}`);
    throw new Error(`Falha ao ler a planilha [${res.status}]`);
  }
  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

function isPlaceholderRow(row: string[]): boolean {
  const codigo = (row[0] ?? "").trim();
  const data = (row[2] ?? "").trim();
  return codigo === "0" || data === "0" || data === "";
}

function toLancamento(row: string[], index: number): Lancamento {
  return {
    row: index + 1,
    codigo: row[0] ?? "",
    organizacao: row[1] ?? "",
    data: row[2] ?? "",
    tipo: row[3] ?? "",
    valor: row[4] ?? "",
    finalidade: row[5] ?? "",
    pagamento: row[7] ?? "",
  };
}

export const getOrcamentoMeses = createServerFn({ method: "GET" }).handler(
  async () => {
    const response = await fetch(
      gatewayBase().replace("/values", ""),
      { headers: gatewayHeaders() },
    );
    if (!response.ok) {
      const body = await response.text();
      console.error(`Sheets metadata read failed [${response.status}]: ${body}`);
      throw new Error(`Falha ao descobrir as abas mensais [${response.status}]`);
    }
    const json = (await response.json()) as {
      sheets?: Array<{ properties?: { title?: string } }>;
    };
    const meses = (json.sheets ?? [])
      .map((sheet) => sheet.properties?.title ?? "")
      .filter(isMonthlyTab)
      .map((nome) => ({ nome, slug: normalizeTabName(nome) }));
    return { meses };
  },
);

export const getOrcamentoMes = createServerFn({ method: "GET" })
  .inputValidator((data: { nome: string; slug?: string }) => data)
  .handler(async ({ data }) => {
    // Resolve o título real da aba no Sheets quando a rota fornecer apenas o slug.
    // Isso preserva acentos e evita falhas como "Março" -> "Marco".
    let nomeAba = data.nome;

    if (!isMonthlyTab(nomeAba) && data.slug) {
      const response = await fetch(
        gatewayBase().replace("/values", ""),
        { headers: gatewayHeaders() },
      );
      if (!response.ok) {
        throw new Error("Não foi possível localizar a aba mensal");
      }

      const json = (await response.json()) as {
        sheets?: Array<{ properties?: { title?: string } }>;
      };

      nomeAba =
        (json.sheets ?? [])
          .map((sheet) => sheet.properties?.title ?? "")
          .find(
            (title) =>
              isMonthlyTab(title) && normalizeTabName(title) === data.slug,
          ) ?? "";
    }

    if (!isMonthlyTab(nomeAba)) {
      throw new Error("Aba mensal inválida");
    }

    const rows = await readSheetRange(nomeAba);
    if (rows.length === 0) {
      throw new Error(`A aba "${nomeAba}" foi encontrada, mas o Google Sheets retornou 0 linhas.`);
    }
    const organizacoes = normalizeBudgetRows(rows);
    const totalOrcamento = findSummaryValue(rows, ["orcamento inicial"], [2]);
    const totalUtilizado = findSummaryValue(rows, ["total gasto"], [8, 2]);
    const totalRestante = findSummaryValue(rows, ["orcamento restante"], [9, 2]);
    return {
      nome: nomeAba,
      slug: normalizeTabName(nomeAba),
      organizacoes,
      totalOrcamento,
      totalUtilizado,
      totalRestante,
    } satisfies OrcamentoMes;
  });

export const getLancamentos = createServerFn({ method: "GET" }).handler(

  async () => {
    const rows = await readRows();
    const entries = rows
      .slice(1)
      .map((row, i) => ({ row, index: i + 1 }))
      .filter(({ row }) => !isPlaceholderRow(row))
      .map(({ row, index }) => toLancamento(row, index));
    return { lancamentos: entries.slice(-15).reverse() };
  },
);

const addSchema = z.object({
  codigo: z.string().trim().min(1).max(10),
  organizacao: z.string().trim().min(1).max(100),
  data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data inválida"),
  tipo: z.enum(["ENTRADA", "SAÍDA"]),
  valor: z.string().trim().min(1).max(20),
  finalidade: z.string().trim().min(1).max(500),
});

export const addLancamento = createServerFn({ method: "POST" })
  .inputValidator((data) => addSchema.parse(data))
  .handler(async ({ data }) => {
    const rows = await readRows();

    // First placeholder row (1-indexed, including header row offset)
    let targetRow = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && isPlaceholderRow(row)) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow === -1) {
      throw new Error(
        "Não há linhas livres na planilha. Adicione mais linhas na aba CONTROLE ENT|SAI.",
      );
    }

    // Next payment number = max existing + 1
    let maxPagamento = 0;
    for (const row of rows.slice(1)) {
      if (isPlaceholderRow(row)) continue;
      const n = Number.parseInt((row[7] ?? "").trim(), 10);
      if (!Number.isNaN(n) && n > maxPagamento) maxPagamento = n;
    }
    const pagamento = String(maxPagamento + 1);

    const writeRange = `'${SHEET_NAME}'!A${targetRow}:H${targetRow}`;
    const res = await fetch(
      `${gatewayBase()}/${writeRange}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: gatewayHeaders(),
        body: JSON.stringify({
          range: writeRange,
          majorDimension: "ROWS",
          values: [
            [
              data.codigo,
              data.organizacao,
              data.data,
              data.tipo,
              data.valor,
              data.finalidade,
              "",
              pagamento,
            ],
          ],
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`Sheets write failed [${res.status}]: ${body}`);
      throw new Error(`Falha ao gravar na planilha [${res.status}]`);
    }

    return { ok: true, pagamento, linha: targetRow };
  },
);
