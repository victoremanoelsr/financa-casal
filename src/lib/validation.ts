import { createHmac } from "node:crypto";
import { z } from "zod";
import { normalizePersonName, normalizeUsername, onlyDigits } from "./format";

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index++) sum += Number(cpf[index]) * (length + 1 - index);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function hashCpf(value: string) {
  const key = process.env.PII_HASH_KEY;
  if (!key || key.length < 32) throw new Error("PII_HASH_KEY inválida ou ausente.");
  return createHmac("sha256", key).update(onlyDigits(value)).digest("hex");
}

export const registrationSchema = z.object({
  fullName: z.string().min(3).max(160).transform(normalizePersonName),
  phone: z.string().min(10).max(30),
  contactEmail: z.email(),
  cpf: z.string().refine(isValidCpf, "CPF inválido"),
  birthDate: z.iso.date(),
  username: z.string().min(3).max(32).transform(normalizeUsername).refine((value) => /^[a-z0-9._-]+$/.test(value), "Usuário inválido"),
  password: z.string().min(8).max(72),
  address: z.object({
    countryCode: z.string().length(2).default("BR"), postalCode: z.string().min(8).max(12), stateCode: z.string().min(2).max(3),
    city: z.string().min(2).max(100), district: z.string().max(100).optional().default(""), street: z.string().min(2).max(160),
    number: z.string().min(1).max(30), complement: z.string().max(120).optional().default(""),
  }),
  familyMode: z.enum(["solo", "create", "join"]),
  familyName: z.string().max(120).optional(),
  joinCode: z.string().max(10).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(3).max(32).transform(normalizeUsername),
  password: z.string().min(8).max(72),
});
