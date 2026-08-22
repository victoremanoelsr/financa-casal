import { describe, expect, it } from "vitest";
import { isValidCpf } from "./validation";

describe("validação de CPF", () => {
  it("aceita CPF com dígitos verificadores válidos", () => expect(isValidCpf("529.982.247-25")).toBe(true));
  it("recusa CPF repetido", () => expect(isValidCpf("111.111.111-11")).toBe(false));
  it("recusa dígitos verificadores incorretos", () => expect(isValidCpf("529.982.247-24")).toBe(false));
});
