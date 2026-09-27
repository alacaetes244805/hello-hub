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
      `${gatewayBase().replace("/values", "")}?fields=sheets.properties.title`,
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
  .inputValidator((data: { nome: string }) => data)
  .handler(async ({ data }) => {
    if (!isMonthlyTab(data.nome)) {
      throw new Error("Aba mensal inválida");
    }
    const rows = await readSheetRange(data.nome);
    const organizacoes = normalizeBudgetRows(rows);
    const totalOrcamento = organizacoes.reduce(
      (sum, item) => sum + numberValue(item.orcamento),
      0,
    );
    const totalUtilizado = organizacoes.reduce(
      (sum, item) => sum + numberValue(item.utilizado),
      0,
    );
    const totalRestante = organizacoes.reduce(
      (sum, item) => sum + numberValue(item.restante),
      0,
    );
    return {
      nome: data.nome,
      slug: normalizeTabName(data.nome),
      organizacoes,
      totalOrcamento: formatMoney(totalOrcamento),
      totalUtilizado: formatMoney(totalUtilizado),
      totalRestante: formatMoney(totalRestante),
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
