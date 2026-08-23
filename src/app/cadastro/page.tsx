"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Home, MapPin, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast, Toaster } from "sonner";
import { normalizePersonName, normalizeUsername } from "@/lib/format";

const stepLabels = ["Dados pessoais", "Endereço", "Login", "Família"];

type RegistrationForm = {
  fullName: string; phone: string; contactEmail: string; cpf: string; birthDate: string;
  postalCode: string; stateCode: string; city: string; district: string; street: string; number: string; complement: string;
  username: string; password: string; familyMode: "solo" | "create" | "join"; familyName: string; joinCode: string;
};

const initialForm: RegistrationForm = {
  fullName: "", phone: "", contactEmail: "", cpf: "", birthDate: "", postalCode: "", stateCode: "PI", city: "", district: "", street: "", number: "", complement: "",
  username: "", password: "", familyMode: "solo", familyName: "", joinCode: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof RegistrationForm>(field: K, value: RegistrationForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 3 && form.password.length < 8) return toast.error("A senha precisa ter no mínimo 8 caracteres.");
    if (step < 4) return setStep((current) => current + 1);
    if (form.familyMode === "create" && !form.familyName.trim()) return toast.error("Informe o nome da família.");
    if (form.familyMode === "join" && !/^FAM-[A-Z0-9]{6}$/.test(form.joinCode.trim().toUpperCase())) return toast.error("Informe um código de família válido.");

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          contactEmail: form.contactEmail,
          cpf: form.cpf,
          birthDate: form.birthDate,
          username: form.username,
          password: form.password,
          address: {
            countryCode: "BR", postalCode: form.postalCode, stateCode: form.stateCode, city: form.city,
            district: form.district, street: form.street, number: form.number, complement: form.complement,
          },
          familyMode: form.familyMode,
          familyName: form.familyMode === "create" ? form.familyName : undefined,
          joinCode: form.familyMode === "join" ? form.joinCode.trim().toUpperCase() : undefined,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) return toast.error(result?.message ?? "Não foi possível criar sua conta.");
      toast.success("Conta criada com sucesso. Agora você já pode entrar.");
      window.setTimeout(() => router.replace("/entrar"), 1200);
    } catch {
      toast.error("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="register-page">
    <header className="register-header"><Link href="/entrar" className="auth-brand"><span className="brand-mark">F</span><span><strong>Finança</strong><small>Familiar</small></span></Link><p>Já tem uma conta? <Link href="/entrar">Entrar</Link></p></header>
    <section className="register-shell">
      <aside><span>PASSO {step} DE 4</span><h1>{stepLabels[step - 1]}</h1><p>Seu cadastro é dividido em etapas rápidas para manter tudo organizado.</p><div className="step-list">{stepLabels.map((label, index) => <div className={index + 1 === step ? "active" : index + 1 < step ? "done" : ""} key={label}><i>{index + 1 < step ? <Check /> : index + 1}</i><span><strong>{label}</strong><small>{index + 1 < step ? "Concluído" : index + 1 === step ? "Em andamento" : "Próxima etapa"}</small></span></div>)}</div></aside>
      <form className="register-card" onSubmit={next}>
        {step === 1 && <><div className="form-title"><span><UserRound /></span><div><h2>Conte um pouco sobre você</h2><p>Nomes serão sempre exibidos em letras maiúsculas.</p></div></div><FieldLike label="Nome completo"><input className="uppercase-input" value={form.fullName} onChange={(event) => update("fullName", normalizePersonName(event.target.value))} placeholder="SEU NOME COMPLETO" required /></FieldLike><div className="form-grid two"><FieldLike label="Telefone / WhatsApp"><input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="(00) 00000-0000" required /></FieldLike><FieldLike label="E-mail"><input type="email" value={form.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} placeholder="voce@exemplo.com" required /></FieldLike></div><div className="form-grid two"><FieldLike label="CPF"><input inputMode="numeric" value={form.cpf} onChange={(event) => update("cpf", event.target.value)} placeholder="000.000.000-00" required /></FieldLike><FieldLike label="Data de nascimento"><input type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} required /></FieldLike></div></>}
        {step === 2 && <><div className="form-title"><span><MapPin /></span><div><h2>Onde você mora?</h2><p>Informe seu endereço para completar o cadastro.</p></div></div><div className="form-grid two"><FieldLike label="País"><select disabled><option>Brasil</option></select></FieldLike><FieldLike label="CEP"><input value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} placeholder="00000-000" required /></FieldLike></div><div className="form-grid two"><FieldLike label="Estado"><select value={form.stateCode} onChange={(event) => update("stateCode", event.target.value)}><option value="PI">PI — Piauí</option><option value="MA">MA — Maranhão</option></select></FieldLike><FieldLike label="Cidade"><input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Teresina" required /></FieldLike></div><FieldLike label="Bairro"><input value={form.district} onChange={(event) => update("district", event.target.value)} /></FieldLike><div className="form-grid address"><FieldLike label="Rua"><input value={form.street} onChange={(event) => update("street", event.target.value)} required /></FieldLike><FieldLike label="Número"><input value={form.number} onChange={(event) => update("number", event.target.value)} required /></FieldLike></div><FieldLike label="Complemento (opcional)"><input value={form.complement} onChange={(event) => update("complement", event.target.value)} /></FieldLike></>}
        {step === 3 && <><div className="form-title"><span><ShieldCheck /></span><div><h2>Crie seu acesso</h2><p>O nome de usuário é único em todo o sistema.</p></div></div><FieldLike label="Nome de usuário"><input value={form.username} onChange={(event) => update("username", normalizeUsername(event.target.value))} placeholder="Ex.: victor" minLength={3} required /><small>Sem espaços. Você poderá alterá-lo depois com confirmação de identidade.</small></FieldLike><FieldLike label="Senha"><div className="password-field"><input value={form.password} onChange={(event) => update("password", event.target.value)} type={show ? "text" : "password"} minLength={8} maxLength={72} placeholder="Mínimo de 8 caracteres" required /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff /> : <Eye />}</button></div><div className="password-strength"><i style={{ width: `${Math.min(100, form.password.length * 10)}%` }} /><span>{form.password.length >= 8 ? "Senha válida" : `${Math.max(0, 8 - form.password.length)} caracteres restantes`}</span></div></FieldLike></>}
        {step === 4 && <><div className="form-title"><span><UsersRound /></span><div><h2>Como deseja usar o sistema?</h2><p>Você poderá entrar em outra família depois nas configurações.</p></div></div><div className="family-options"><button type="button" className={form.familyMode === "solo" ? "active" : ""} onClick={() => update("familyMode", "solo")}><span><Home /></span><strong>Somente eu</strong><small>Cria uma família individual.</small></button><button type="button" className={form.familyMode === "create" ? "active" : ""} onClick={() => update("familyMode", "create")}><span><UsersRound /></span><strong>Criar uma família</strong><small>Gera um código exclusivo.</small></button><button type="button" className={form.familyMode === "join" ? "active" : ""} onClick={() => update("familyMode", "join")}><span><ArrowRight /></span><strong>Entrar em uma família</strong><small>Use o código recebido.</small></button></div>{form.familyMode === "create" && <FieldLike label="Nome da família"><input value={form.familyName} onChange={(event) => update("familyName", event.target.value)} placeholder="Ex.: Família Silva" required /></FieldLike>}{form.familyMode === "join" && <FieldLike label="Código da família"><input className="family-code-input" value={form.joinCode} onChange={(event) => update("joinCode", event.target.value.toUpperCase())} placeholder="FAM-XXXXXX" maxLength={10} required /></FieldLike>}</>}
        <footer className="register-actions">{step > 1 ? <button type="button" className="ghost-button" onClick={() => setStep((current) => current - 1)}><ArrowLeft /> Voltar</button> : <span />}<button className="primary-button" disabled={loading}>{loading ? "Criando conta..." : step === 4 ? "Criar minha conta" : "Avançar"} {!loading && <ArrowRight />}</button></footer>
      </form>
    </section>
    <Toaster position="top-right" richColors />
  </main>;
}

function FieldLike({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}
