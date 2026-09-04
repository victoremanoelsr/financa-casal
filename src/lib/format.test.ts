import { describe, expect, it } from "vitest";
import { generateCsv, getBillStatus, normalizePersonName, normalizeUsername, splitInstallments } from "./format";

describe("normalização de identidade", () => {
  it("armazena nomes de pessoas em maiúsculas mesmo quando digitados em minúsculas", () => {
    expect(normalizePersonName("  José da silva  ")).toBe("JOSÉ DA SILVA");
  });

  it("normaliza o username para comparação global", () => {
    expect(normalizeUsername(" Victor Silva ")).toBe("victorsilva");
  });
});

describe("parcelamento financeiro", () => {
  it("divide R$ 900 em três parcelas exatas", () => {
    expect(splitInstallments(90_000, 3)).toEqual([30_000, 30_000, 30_000]);
  });

  it("distribui os centavos sem perder ou duplicar valor", () => {
    const installments = splitInstallments(10_000, 3);
    expect(installments).toEqual([3_334, 3_333, 3_333]);
    expect(installments.reduce((sum, value) => sum + value, 0)).toBe(10_000);
  });
});

describe("status de vencimento", () => {
  const today = new Date(2026, 7, 18);
  it("considera pago antes de calcular atraso", () => expect(getBillStatus("2026-08-10", "2026-08-09T12:00:00Z", today)).toBe("paid"));
  it("marca vencimento passado como atrasado", () => expect(getBillStatus("2026-08-17", null, today)).toBe("overdue"));
  it("mantém vencimento futuro pendente", () => expect(getBillStatus("2026-08-19", null, today)).toBe("pending"));
});

describe("geração de CSV para exportação", () => {
  it("gera arquivo CSV com BOM UTF-8 e delimitador ponto-e-vírgula", () => {
    const data = [
      { id: "1", description: "Supermercado", amount: 150.5, date: "2026-09-01" },
      { id: "2", description: "Salário", amount: 3500.0, date: "2026-09-05" },
    ];
    const csv = generateCsv(data, [
      { key: "date", header: "Data" },
      { key: "description", header: "Descrição" },
      { key: "amount", header: "Valor", format: (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}` },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Data";"Descrição";"Valor"');
    expect(csv).toContain('"2026-09-01";"Supermercado";"R$ 150,50"');
    expect(csv).toContain('"2026-09-05";"Salário";"R$ 3500,00"');
  });
});

