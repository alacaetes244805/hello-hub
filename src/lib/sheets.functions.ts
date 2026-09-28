import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SPREADSHEET_ID = "1ZWBwhXmwkALhHEuF9eGSJ3g2QvoJV75hQ8TpjAhT4dg";
const SHEET_NAME = "CONTROLE ENT|SAI";
const READ_RANGE = "'CONTROLE ENT|SAI'!A1:H200";

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

export type OrcamentoLinha = {
  organizacao: string;
  orcamento: string;
  semanas: string[];
  utilizado: string;
  restante: string;
};

export type OrcamentoMes = {
  nome: string;
  slug: string;
  orcamentoInicial: string;
  totalGasto: string;
  orcamentoRestante: string;
  organizacoes: OrcamentoLinha[];
  subgruposSecretaria: OrcamentoLinha[];
};

function gatewayBase() {
  return "https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/" + SPREADSHEET_ID + "/values";
}

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_SHEETS_API_KEY"];

  if (!lovableKey || !connectionKey) {
    throw new Error("Credenciais do Google Sheets não configuradas");
  }

  return {
    Authorization: "Bearer " + lovableKey,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
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
  return /^(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+\d{4}$/i.test(
    value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
}

function numberValue(value: string | undefined): number {
  const normalized = (value ?? "")
    .replace(/R\$\s?/i, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moneyCell(value: string | undefined): string {
  const raw = (value ?? "").trim();
  return raw ? formatMoney(numberValue(raw)) : "";
}

function readCell(rows: string[][], rowNumber: number, columnNumber: number): string {
  return (rows[rowNumber - 1]?.[columnNumber - 1] ?? "").trim();
}

function readLinha(rows: string[][], rowNumber: number): OrcamentoLinha {
  return {
    organizacao: readCell(rows, rowNumber, 2),
    orcamento: moneyCell(readCell(rows, rowNumber, 3)),
    semanas: [4, 5, 6, 7, 8].map((column) => moneyCell(readCell(rows, rowNumber, column))),
    utilizado: moneyCell(readCell(rows, rowNumber, 9)),
    restante: moneyCell(readCell(rows, rowNumber, 10)),
  };
}

async function readSheetRange(sheetName: string): Promise<string[][]> {
  const range = "'" + sheetName.replaceAll("'", "''") + "'!A1:Z200";

  const res = await fetch(
    gatewayBase() + "/" + encodeURIComponent(range),
    { headers: gatewayHeaders() },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("Sheets budget read failed [" + res.status + "]: " + body);
    throw new Error('Falha ao ler a aba "' + sheetName + '" [' + res.status + "]");
  }

  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

export const getOrcamentoMeses = createServerFn({ method: "GET" }).handler(async () => {
  const response = await fetch(
    gatewayBase().replace("/values", ""),
    { headers: gatewayHeaders() },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("Sheets metadata read failed [" + response.status + "]: " + body);
    throw new Error("Falha ao descobrir as abas mensais [" + response.status + "]");
  }

  const json = (await response.json()) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  const meses = (json.sheets ?? [])
    .map((sheet) => sheet.properties?.title?.trim() ?? "")
    .filter(isMonthlyTab)
    .map((nome) => ({ nome, slug: normalizeTabName(nome) }));

  return { meses };
});

export const getOrcamentoMes = createServerFn({ method: "GET" })
  .inputValidator((data: { nome: string; slug?: string }) => data)
  .handler(async ({ data }) => {
    let nomeAba = data.nome;

    if (!isMonthlyTab(nomeAba) && data.slug) {
      const response = await fetch(
        gatewayBase().replace("/values", ""),
        { headers: gatewayHeaders() },
      );

      if (!response.ok) {
        throw new Error("Não foi possível localizar a aba mensal.");
      }

      const json = (await response.json()) as {
        sheets?: Array<{ properties?: { title?: string } }>;
      };

      nomeAba =
        (json.sheets ?? [])
          .map((sheet) => sheet.properties?.title ?? "")
          .find((title) => isMonthlyTab(title) && normalizeTabName(title) === data.slug) ?? "";
    }

    if (!isMonthlyTab(nomeAba)) {
      throw new Error("A aba selecionada não possui o formato MÊS ANO.");
    }

    const rows = await readSheetRange(nomeAba);

    if (rows.length < 17) {
      throw new Error('A aba "' + nomeAba + '" não retornou as 17 linhas esperadas do demonstrativo.');
    }

    // Estrutura fixa do demonstrativo:
    // C2 = orçamento inicial
    // I17 = total gasto
    // J17 = orçamento restante
    // B3:B10 = categorias principais
    // B11:B14 = subgrupos da Secretaria
    // D:H = Sem. 1 até Sem. 5
    // I = total gasto da linha
    // J = orçamento restante da linha

    const organizacoes = Array.from({ length: 8 }, (_, index) => readLinha(rows, index + 3))
      .filter((linha) => linha.organizacao !== "");

    const subgruposSecretaria = Array.from({ length: 4 }, (_, index) => readLinha(rows, index + 11))
      .filter((linha) => linha.organizacao !== "");

    if (organizacoes.length === 0) {
      throw new Error('A aba "' + nomeAba + '" foi lida, mas nenhuma categoria foi encontrada em B3:B10.');
    }

    return {
      nome: nomeAba,
      slug: normalizeTabName(nomeAba),
      orcamentoInicial: moneyCell(readCell(rows, 2, 3)),
      totalGasto: moneyCell(readCell(rows, 17, 9)),
      orcamentoRestante: moneyCell(readCell(rows, 17, 10)),
      organizacoes,
      subgruposSecretaria,
    } satisfies OrcamentoMes;
  });

async function readRows(): Promise<string[][]> {
  const res = await fetch(gatewayBase() + "/" + READ_RANGE, { headers: gatewayHeaders() });

  if (!res.ok) {
    const body = await res.text();
    console.error("Sheets read failed [" + res.status + "]: " + body);
    throw new Error("Falha ao ler a planilha [" + res.status + "]");
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

export const getLancamentos = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await readRows();

  const entries = rows
    .slice(1)
    .map((row, i) => ({ row, index: i + 1 }))
    .filter(({ row }) => !isPlaceholderRow(row))
    .map(({ row, index }) => toLancamento(row, index));

  return { lancamentos: entries.slice(-15).reverse() };
});

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

    let targetRow = -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      if (row && isPlaceholderRow(row)) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      throw new Error("Não há linhas livres na planilha. Adicione mais linhas na aba CONTROLE ENT|SAI.");
    }

    let maxPagamento = 0;

    for (const row of rows.slice(1)) {
      if (isPlaceholderRow(row)) continue;

      const n = Number.parseInt((row[7] ?? "").trim(), 10);

      if (!Number.isNaN(n) && n > maxPagamento) {
        maxPagamento = n;
      }
    }

    const pagamento = String(maxPagamento + 1);
    const writeRange = "'" + SHEET_NAME + "'!A" + targetRow + ":H" + targetRow;

    const res = await fetch(
      gatewayBase() + "/" + writeRange + "?valueInputOption=USER_ENTERED",
      {
        method: "PUT",
        headers: gatewayHeaders(),
        body: JSON.stringify({
          range: writeRange,
          majorDimension: "ROWS",
          values: [[
            data.codigo,
            data.organizacao,
            data.data,
            data.tipo,
            data.valor,
            data.finalidade,
            "",
            pagamento,
          ]],
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Sheets write failed [" + res.status + "]: " + body);
      throw new Error("Falha ao gravar na planilha [" + res.status + "]");
    }

    return { ok: true, pagamento, linha: targetRow };
  });
