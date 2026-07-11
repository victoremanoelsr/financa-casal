import { FormEvent, useState } from "react";
import { ArrowRight, HeartHandshake, LockKeyhole, Mail, WalletCards } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";

export default function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = "/dashboard";
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setMessage(error ? error.message : "Cadastro criado. Verifique seu e-mail para confirmar a conta.");
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
            {mode === "signup" && (
              <label>Seu nome<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado(a)?" required /></label>
            )}
            <label>E-mail<div className="input-icon"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required /></div></label>
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
