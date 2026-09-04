"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { normalizeUsername } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter(); const [show, setShow] = useState(false); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = normalizeUsername(String(data.get("username")));
    const password = String(data.get("password"));
    if (!username || password.length < 8) return toast.error("Confira seu usuário e sua senha de no mínimo 8 caracteres.");
    if (username === "preview" && password === "Preview@2026") {
      document.cookie = "financa_demo=1; path=/; max-age=86400; samesite=lax";
      router.replace("/");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) return toast.error(result?.message ?? "Não foi possível entrar.");
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }
  return <main className="auth-page"><section className="auth-visual"><div className="auth-brand"><span className="brand-mark">F</span><span><strong>Finança</strong><small>Familiar</small></span></div><div className="auth-message"><span>CONTROLE QUE APROXIMA</span><h1>As finanças da sua família, simples de verdade.</h1><p>Organize receitas, contas, cartões e objetivos em um espaço seguro feito para todos.</p><div className="auth-proof"><span>FF</span><p><strong>Organização familiar</strong>Todos acompanham as finanças em um único lugar.</p></div></div><footer>Seguro · Organizado · Feito para famílias</footer></section><section className="auth-form-side"><form className="auth-card" onSubmit={submit}><div className="auth-mobile-brand"><span className="brand-mark">F</span><strong>Finança Familiar</strong></div><span className="eyebrow">BEM-VINDO DE VOLTA</span><h2>Acesse sua conta</h2><p>Entre com seu nome de usuário e senha.</p><label><span>Nome de usuário</span><div className="auth-input"><UserRound /><input name="username" autoComplete="username" placeholder="Digite seu usuário" required /></div></label><label><span>Senha</span><div className="auth-input"><LockKeyhole /><input name="password" autoComplete="current-password" type={show ? "text" : "password"} placeholder="Mínimo de 8 caracteres" required minLength={8} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff /> : <Eye />}</button></div></label><button className="auth-submit" disabled={loading}>{loading ? <span className="spinner" /> : "Acessar"}</button><div className="auth-links"><Link href="/cadastro">Criar conta</Link><Link href="/recuperar-acesso">Esqueceu a senha?</Link></div></form></section><Toaster position="top-right" richColors /></main>;
}
