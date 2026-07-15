import { FormEvent, useState } from "react";
import { ArrowRight, HeartHandshake, LockKeyhole, UserRound, WalletCards } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";
import { nameToAuthEmail, normalizeName, translateAuthError } from "@/lib/username-auth";

export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (!configured) {
      window.location.href = "/dashboard";
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    const cleanName = normalizeName(name);
    const authEmail = nameToAuthEmail(cleanName);

    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) setMessage(translateAuthError(error.message));
      else window.location.href = "/dashboard";
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: { data: { display_name: cleanName } },
      });
      if (error) {
        setMessage(translateAuthError(error.message));
      } else if (data.session) {
        window.location.href = "/dashboard";
      } else {
        setMessage(
          "Conta criada, mas o login automático está desativado. Peça para quem administra o projeto Supabase desligar \"Confirm email\" em Authentication > Sign In / Up > Email, e tente entrar novamente."
        );
      }
    }
    setBusy(false);
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand brand-light">
          <span className="brand-mark"><HeartHandshake size={26} /></span>
          <div><strong>Finanças a Dois</strong><small>Planejem juntos. Vivam melhor.</small></div>
        </div>
        <div className="hero-copy">
          <span className="eyebrow">FINANÇAS DO CASAL, SEM COMPLICAÇÃO</span>
          <h1>O dinheiro de vocês, organizado em um só lugar.</h1>
          <p>Entradas, contas, cartões, orçamento e sonhos compartilhados com uma visão clara do mês.</p>
          <div className="hero-points">
            <span><WalletCards size={18} /> Controle completo do mês</span>
            <span><LockKeyhole size={18} /> Dados protegidos por usuário e família</span>
          </div>
        </div>
        <div className="hero-orb orb-one" />
        <div className="hero-orb orb-two" />
      </section>

      <section className="login-panel">
        <div className="mobile-brand">
          <span className="brand-mark"><HeartHandshake size={24} /></span>
          <strong>Finanças a Dois</strong>
        </div>
        <div className="login-card">
          <span className="eyebrow dark">BEM-VINDOS</span>
          <h2>{mode === "login" ? "Entrem na conta de vocês" : "Criem a família financeira"}</h2>
          <p className="muted">{mode === "login" ? "Acompanhem o mês e tomem decisões juntos." : "Comecem com sua conta e convidem seu par depois."}</p>

          <form onSubmit={submit} className="auth-form">
            <label>Seu nome<div className="input-icon"><UserRound size={18} /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado(a)?" required /></div></label>
            <label>Senha<div className="input-icon"><LockKeyhole size={18} /><input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" required /></div></label>
            {message && <div className="form-message">{message}</div>}
            <button className="primary-button full" disabled={busy}>
              {busy ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}<ArrowRight size={18} />
            </button>
          </form>

          <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(null); }}>
            {mode === "login" ? "Ainda não têm conta? Criar agora" : "Já tem conta? Entrar"}
          </button>

          {!configured && (
            <div className="demo-note">
              <strong>Modo demonstração ativo</strong>
              <span>O Supabase ainda não foi configurado. Entre para testar com dados locais de exemplo.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
