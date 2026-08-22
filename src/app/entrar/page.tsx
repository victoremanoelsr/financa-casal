"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { normalizeUsername } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter(); const [show, setShow] = useState(false); const [loading, setLoading] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const username = normalizeUsername(String(data.get("username"))); const password = String(data.get("password")); if (!username || password.length < 8) return toast.error("Confira seu usuário e sua senha de no mínimo 8 caracteres."); setLoading(true); setTimeout(() => router.push("/"), 700); }
  return <main className="auth-page"><section className="auth-visual"><div className="auth-brand"><span className="brand-mark">F</span><span><strong>Finança</strong><small>Familiar</small></span></div><div className="auth-message"><span>CONTROLE QUE APROXIMA</span><h1>As finanças da sua família, simples de verdade.</h1><p>Organize receitas, contas, cartões e objetivos em um espaço seguro feito para todos.</p><div className="auth-proof"><span>FS</span><p><strong>Família Silva</strong>“Agora todo mundo sabe o que vence e quanto podemos guardar.”</p></div></div><footer>Seguro · Organizado · Feito para famílias</footer></section><section className="auth-form-side"><form className="auth-card" onSubmit={submit}><div className="auth-mobile-brand"><span className="brand-mark">F</span><strong>Finança Familiar</strong></div><span className="eyebrow">BEM-VINDO DE VOLTA</span><h2>Acesse sua conta</h2><p>Entre com seu nome de usuário e senha.</p><label><span>Nome de usuário</span><div className="auth-input"><UserRound /><input name="username" autoComplete="username" placeholder="Digite seu usuário" required /></div></label><label><span>Senha</span><div className="auth-input"><LockKeyhole /><input name="password" autoComplete="current-password" type={show ? "text" : "password"} placeholder="Mínimo de 8 caracteres" required minLength={8} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff /> : <Eye />}</button></div></label><button className="auth-submit" disabled={loading}>{loading ? <span className="spinner" /> : "Acessar"}</button><div className="auth-links"><Link href="/cadastro">Criar conta</Link><Link href="/recuperar-acesso">Esqueceu a senha?</Link></div><small className="demo-note">Demonstração local: use qualquer usuário e uma senha de 8 caracteres.</small></form></section><Toaster position="top-right" richColors /></main>;
}
